#!/usr/bin/env python3
"""Configure CREN's dedicated Resend receiving subdomain in Namecheap.

Dry-run is the default. --apply creates/enables the Resend receiving domain,
merge-writes only its required receiving records into the existing Namecheap
zone, and triggers Resend verification. Other DNS records are preserved.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path


NAMECHEAP_HELPER = Path("/Users/mr.adams/.codex/skills/namecheap-dns/scripts/namecheap_dns.py")
DEFAULT_ENV_FILE = Path("/Users/mr.adams/.config/doublerproductions/resend-namecheap.env")
DEFAULT_RESEND_ENV_FILE = Path(
    "/Users/mr.adams/.config/doublerproductions/resend-namecheap.env"
)
DEFAULT_ZONE = "columbusrealestatenews.com"
DEFAULT_RECEIVING_DOMAIN = "review.columbusrealestatenews.com"
RESEND_API = "https://api.resend.com"


def load_namecheap_helper():
    spec = importlib.util.spec_from_file_location("namecheap_dns", NAMECHEAP_HELPER)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load Namecheap helper: {NAMECHEAP_HELPER}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def resend_request(api_key: str, method: str, path: str, payload=None):
    command = [
        "curl", "-fsS", "--max-time", "30", "-X", method,
        f"{RESEND_API}{path}",
        "-H", f"Authorization: Bearer {api_key}",
        "-H", "Accept: application/json",
        "-H", "Content-Type: application/json",
    ]
    if payload is not None:
        command.extend(["--data", json.dumps(payload)])
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Resend API request failed.")
    return json.loads(result.stdout)


def relative_name(name: str, zone: str) -> str:
    normalized = name.rstrip(".")
    if normalized == zone:
        return "@"
    suffix = f".{zone}"
    if normalized.endswith(suffix):
        return normalized[: -len(suffix)] or "@"
    return normalized


def receiving_records(domain_data: dict, zone: str) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
    for source in domain_data.get("records", []):
        if source.get("record") != "Receiving":
            continue
        record_type = str(source.get("type", "")).upper()
        if record_type not in {"MX", "TXT", "CNAME"}:
            continue
        records.append(
            {
                "Name": relative_name(str(source.get("name", "")), zone),
                "Type": record_type,
                "Address": str(source.get("value", "")).strip().strip('"'),
                "MXPref": str(source.get("priority") or 10),
                "TTL": "1800",
            }
        )
    if not records:
        raise RuntimeError("Resend returned no Receiving DNS records.")
    return records


def merge_records(current: list[dict[str, str]], required: list[dict[str, str]]):
    replaced = {(record["Name"], record["Type"]) for record in required}
    return [
        record for record in current
        if (record["Name"], record["Type"].upper()) not in replaced
    ] + required


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zone", default=DEFAULT_ZONE)
    parser.add_argument("--receiving-domain", default=DEFAULT_RECEIVING_DOMAIN)
    parser.add_argument("--namecheap-env-file", type=Path, default=DEFAULT_ENV_FILE)
    parser.add_argument("--resend-env-file", type=Path, default=DEFAULT_RESEND_ENV_FILE)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    helper = load_namecheap_helper()
    helper.load_dotenv(str(args.namecheap_env_file))
    helper.load_dotenv(str(args.resend_env_file))
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("RESEND_API_KEY is missing from the dotenv file.")

    listed = resend_request(api_key, "GET", "/domains")
    domain = next((item for item in listed.get("data", []) if item.get("name") == args.receiving_domain), None)
    if domain is None and not args.apply:
        print(f"Would create Resend receiving-only domain: {args.receiving_domain}")
        print("Dry run only. No Resend or DNS state changed.")
        return 0
    if domain is None:
        domain = resend_request(api_key, "POST", "/domains", {
            "name": args.receiving_domain,
            "region": "us-east-1",
            "capabilities": {"sending": "disabled", "receiving": "enabled"},
        })
    elif domain.get("capabilities", {}).get("receiving") != "enabled":
        if not args.apply:
            print(f"Would enable receiving on Resend domain: {args.receiving_domain}")
            print("Dry run only. No Resend or DNS state changed.")
            return 0
        resend_request(api_key, "PATCH", f"/domains/{domain['id']}", {
            "capabilities": {"sending": "disabled", "receiving": "enabled"},
        })

    domain_data = resend_request(api_key, "GET", f"/domains/{domain['id']}")
    required = receiving_records(domain_data, args.zone)
    sld, tld = helper.split_domain(args.zone)
    root = helper.namecheap("namecheap.domains.dns.getHosts", {"SLD": sld, "TLD": tld})
    using_namecheap_dns, current = helper.parse_hosts(root)
    if not using_namecheap_dns:
        raise RuntimeError(f"{args.zone} is not using Namecheap BasicDNS.")
    merged = merge_records(current, required)

    print(f"Zone: {args.zone}")
    print(f"Receiving domain: {args.receiving_domain}")
    print(f"Current records: {len(current)}")
    print(f"Merged records: {len(merged)}")
    for record in required:
        priority = f" priority={record['MXPref']}" if record["Type"] == "MX" else ""
        print(f"  {record['Type']:5} {record['Name']:24} {record['Address']}{priority}")

    if not args.apply:
        print("Dry run only. No Resend or DNS state changed.")
        return 0

    helper.namecheap(
        "namecheap.domains.dns.setHosts",
        helper.build_set_hosts(sld, tld, merged),
    )
    resend_request(api_key, "POST", f"/domains/{domain['id']}/verify", {})
    print("Namecheap zone updated and Resend verification triggered.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1)
