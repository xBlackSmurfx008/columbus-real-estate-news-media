#!/usr/bin/env python3
"""
Apply Vercel DNS on Namecheap via API: apex A + www CNAME, preserving other host records.

Requires Namecheap API access (Profile → Tools → Business & Dev Tools → API Access):
  - Enable API, whitelist your public IP (NAMECHEAP_CLIENT_IP), create API key.

Loads env from: ``scripts/.env.namecheap``, then parent ``.env.namecheap`` (non-destructive),
then overrides from ``NAMECHEAP_ENV_FILE`` (export path) or ``--env-file PATH`` (wins over prior).

Reference: https://www.namecheap.com/support/api/methods/domains-dns/set-hosts/
"""

from __future__ import annotations

import argparse
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

# Vercel (from project domain settings)
VERCEL_APEX_IP = "76.76.21.21"
VERCEL_WWW_CNAME = "cname.vercel-dns.com"

PRODUCTION_API = "https://api.namecheap.com/xml.response"
SANDBOX_API = "https://api.sandbox.namecheap.com/xml.response"


def _local(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def load_env_file(path: str, *, override: bool = False) -> None:
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if override:
                os.environ[key] = val
            else:
                os.environ.setdefault(key, val)


def discover_public_ip() -> str:
    req = urllib.request.Request(
        "https://api.ipify.org",
        headers={"User-Agent": "namecheap-sync-vercel-dns/1.0"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode().strip()


def namecheap_get(
    base_url: str,
    api_user: str,
    api_key: str,
    user_name: str,
    client_ip: str,
    command: str,
    extra: dict[str, str],
) -> str:
    params: dict[str, str] = {
        "ApiUser": api_user,
        "ApiKey": api_key,
        "UserName": user_name,
        "ClientIp": client_ip,
        "Command": command,
        **extra,
    }
    url = base_url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "namecheap-sync-vercel-dns/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8")


def parse_api_status(xml_text: str) -> tuple[str, list[str]]:
    root = ET.fromstring(xml_text)
    status = root.attrib.get("Status", "")
    errs: list[str] = []
    for el in root.iter():
        if _local(el.tag) == "Error":
            num = el.attrib.get("Number", "")
            txt = (el.text or "").strip()
            errs.append(f"{num}: {txt}".strip())
    return status, errs


def parse_hosts(xml_text: str) -> tuple[bool, list[dict[str, str]]]:
    """Returns (is_using_our_dns, hosts)."""
    root = ET.fromstring(xml_text)
    using = True
    hosts: list[dict[str, str]] = []
    for el in root.iter():
        if _local(el.tag) == "DomainDNSGetHostsResult":
            v = el.attrib.get("IsUsingOurDNS", "true").lower()
            using = v == "true"
        if _local(el.tag) == "Host":
            name = el.get("Name")
            if not name:
                continue
            hosts.append(
                {
                    "Name": name,
                    "Type": el.get("Type") or "",
                    "Address": el.get("Address") or "",
                    "MXPref": el.get("MXPref") or "10",
                    "TTL": el.get("TTL") or "1800",
                }
            )
    return using, hosts


def should_replace_for_vercel(h: dict[str, str]) -> bool:
    """Remove conflicting apex / www records so Vercel A + www CNAME can apply."""
    n, t = h["Name"], h["Type"]
    if n == "@" and t in ("A", "AAAA"):
        return True
    if n == "www" and t in ("A", "AAAA", "CNAME", "ALIAS"):
        return True
    return False


def merge_vercel(hosts: list[dict[str, str]]) -> list[dict[str, str]]:
    kept = [h for h in hosts if not should_replace_for_vercel(h)]
    kept.append(
        {
            "Name": "@",
            "Type": "A",
            "Address": VERCEL_APEX_IP,
            "MXPref": "10",
            "TTL": "1800",
        }
    )
    kept.append(
        {
            "Name": "www",
            "Type": "CNAME",
            "Address": VERCEL_WWW_CNAME,
            "MXPref": "10",
            "TTL": "1800",
        }
    )
    return kept


def build_set_hosts_params(hosts: list[dict[str, str]]) -> dict[str, str]:
    out: dict[str, str] = {}
    for i, h in enumerate(hosts, start=1):
        out[f"HostName{i}"] = h["Name"]
        out[f"RecordType{i}"] = h["Type"]
        out[f"Address{i}"] = h["Address"]
        out[f"MXPref{i}"] = h["MXPref"]
        out[f"TTL{i}"] = h["TTL"]
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync Vercel DNS records via Namecheap API.")
    parser.add_argument(
        "--domain",
        default=os.environ.get("NAMECHEAP_DOMAIN", "columbusrealestatenews.com"),
        help="Full domain (default: env NAMECHEAP_DOMAIN or columbusrealestatenews.com)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch current hosts and print merged records; do not call setHosts.",
    )
    parser.add_argument(
        "--sandbox",
        action="store_true",
        help="Use Namecheap sandbox API endpoint.",
    )
    parser.add_argument(
        "--env-file",
        metavar="PATH",
        help="Optional .env path with NAMECHEAP_* values; overrides scripts/.env.namecheap.",
    )
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    load_env_file(os.path.join(script_dir, ".env.namecheap"))
    load_env_file(os.path.join(os.path.dirname(script_dir), ".env.namecheap"))
    extra = os.environ.get("NAMECHEAP_ENV_FILE", "").strip()
    if extra:
        load_env_file(os.path.expanduser(extra), override=True)
    if args.env_file:
        load_env_file(os.path.expanduser(args.env_file), override=True)

    api_user = os.environ.get("NAMECHEAP_API_USER", "")
    api_key = os.environ.get("NAMECHEAP_API_KEY", "")
    user_name = os.environ.get("NAMECHEAP_USERNAME", api_user)
    client_ip = os.environ.get("NAMECHEAP_CLIENT_IP", "").strip()
    if not client_ip:
        try:
            client_ip = discover_public_ip()
            print(f"Using detected public IP for ClientIp: {client_ip}", file=sys.stderr)
            print("(Must match an IP whitelisted in Namecheap → API Access.)", file=sys.stderr)
        except OSError as e:
            print(
                "Set NAMECHEAP_CLIENT_IP to your public IP (whitelisted in Namecheap API settings).",
                file=sys.stderr,
            )
            print(f"Could not auto-detect IP: {e}", file=sys.stderr)
            return 1

    if not api_user or not api_key:
        print(
            "Missing NAMECHEAP_API_USER or NAMECHEAP_API_KEY. Copy scripts/.env.namecheap.example to scripts/.env.namecheap and fill in.",
            file=sys.stderr,
        )
        return 1

    parts = args.domain.lower().strip().split(".")
    if len(parts) < 2:
        print("Invalid --domain", file=sys.stderr)
        return 1
    sld, tld = parts[0], ".".join(parts[1:])

    base = SANDBOX_API if args.sandbox else PRODUCTION_API

    try:
        xml_get = namecheap_get(
            base,
            api_user,
            api_key,
            user_name,
            client_ip,
            "namecheap.domains.dns.getHosts",
            {"SLD": sld, "TLD": tld},
        )
    except urllib.error.HTTPError as e:
        print(f"HTTP error from Namecheap getHosts: {e}", file=sys.stderr)
        try:
            print(e.read().decode("utf-8", errors="replace"), file=sys.stderr)
        except OSError:
            pass
        return 1
    except OSError as e:
        print(f"Request failed: {e}", file=sys.stderr)
        return 1

    status, errs = parse_api_status(xml_get)
    if status != "OK":
        print("getHosts failed:", file=sys.stderr)
        for line in errs:
            print(" ", line, file=sys.stderr)
        print(xml_get[:2000], file=sys.stderr)
        return 1

    using, hosts = parse_hosts(xml_get)
    if not using:
        print(
            "IsUsingOurDNS is false — point the domain to Namecheap nameservers "
            "(Domain → Manage → Nameservers: Namecheap BasicDNS) before using this script.",
            file=sys.stderr,
        )
        return 1

    merged = merge_vercel(hosts)
    print("Merged host records to apply:")
    for h in merged:
        print(f"  {h['Type']:6} {h['Name']!s:20} -> {h['Address']}")

    if args.dry_run:
        print("\nDry run: setHosts not called.")
        return 0

    if len(merged) > 10:
        print(
            f"Warning: {len(merged)} records — Namecheap recommends HTTP POST for >10 hostnames; "
            "this script uses GET. Split or extend the script if the request fails.",
            file=sys.stderr,
        )

    params = build_set_hosts_params(merged)
    params["SLD"] = sld
    params["TLD"] = tld

    try:
        xml_set = namecheap_get(
            base,
            api_user,
            api_key,
            user_name,
            client_ip,
            "namecheap.domains.dns.setHosts",
            params,
        )
    except urllib.error.HTTPError as e:
        print(f"HTTP error from Namecheap setHosts: {e}", file=sys.stderr)
        try:
            print(e.read().decode("utf-8", errors="replace"), file=sys.stderr)
        except OSError:
            pass
        return 1
    except OSError as e:
        print(f"Request failed: {e}", file=sys.stderr)
        return 1

    status, errs = parse_api_status(xml_set)
    if status != "OK":
        print("setHosts failed:", file=sys.stderr)
        for line in errs:
            print(" ", line, file=sys.stderr)
        print(xml_set[:2000], file=sys.stderr)
        return 1

    print("\nsetHosts OK. Allow time for DNS propagation; confirm in Vercel → Domains.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
