#!/usr/bin/env python3
"""Safe Telegram Bot API helper for CREN notification setup.

Reads secrets from environment variables or mode-restricted files and reports
redacted status codes only. Never pass bot tokens as command-line arguments.
"""

from __future__ import annotations

import argparse
import json
import os
import stat
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


API_HOST = "https://api.telegram.org"


def print_json(payload: dict[str, Any], exit_code: int = 0) -> int:
    print(json.dumps(payload, indent=2, sort_keys=True))
    return exit_code


def read_secret(env_name: str, file_env_name: str) -> str | None:
    direct = os.environ.get(env_name, "").strip()
    if direct:
        return direct

    file_name = os.environ.get(file_env_name, "").strip()
    if not file_name:
        return None

    path = Path(file_name)
    try:
        mode = path.stat().st_mode
    except OSError:
        return None

    if mode & (stat.S_IRWXG | stat.S_IRWXO):
        raise RuntimeError(f"{file_env_name}_PERMISSIONS_TOO_OPEN")

    return path.read_text(encoding="utf-8").strip() or None


def read_token() -> str:
    token = read_secret("TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_TOKEN_FILE")
    if not token:
        raise RuntimeError("TELEGRAM_TOKEN_NOT_CONFIGURED")
    return token


def read_chat_id() -> str:
    chat_id = read_secret("TELEGRAM_CHAT_ID", "TELEGRAM_CHAT_ID_FILE")
    if not chat_id:
        raise RuntimeError("TELEGRAM_CHAT_ID_NOT_CONFIGURED")
    return chat_id


def telegram_request(token: str, method: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{API_HOST}/bot{token}/{method}",
        data=body,
        headers={"content-type": "application/json"} if body is not None else {},
        method="POST" if body is not None else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            raw = response.read(256_000)
    except urllib.error.HTTPError as error:
        return {"ok": False, "error": f"TELEGRAM_HTTP_{error.code}"}
    except Exception:
        return {"ok": False, "error": "TELEGRAM_DELIVERY_FAILED"}

    try:
        parsed = json.loads(raw.decode("utf-8"))
    except Exception:
        return {"ok": False, "error": "TELEGRAM_INVALID_RESPONSE"}

    if not isinstance(parsed, dict):
        return {"ok": False, "error": "TELEGRAM_INVALID_RESPONSE"}
    return parsed


def cmd_validate(_: argparse.Namespace) -> int:
    token = read_token()
    result = telegram_request(token, "getMe")
    if not result.get("ok"):
        return print_json({"ok": False, "error": result.get("error", "TELEGRAM_REJECTED")}, 1)

    bot = result.get("result") if isinstance(result.get("result"), dict) else {}
    return print_json({
        "ok": True,
        "bot": {
            "id": bot.get("id"),
            "username": bot.get("username"),
            "first_name": bot.get("first_name"),
        },
    })


def cmd_discover_chat(args: argparse.Namespace) -> int:
    token = read_token()
    result = telegram_request(token, "getUpdates", {"limit": args.limit, "offset": args.offset})
    if not result.get("ok"):
        return print_json({"ok": False, "error": result.get("error", "TELEGRAM_REJECTED")}, 1)

    updates = result.get("result")
    if not isinstance(updates, list) or not updates:
        return print_json({"ok": False, "error": "TELEGRAM_NO_UPDATES"}, 1)

    chats: list[dict[str, Any]] = []
    seen: set[str] = set()
    for update in updates:
        if not isinstance(update, dict):
            continue
        message = update.get("message") or update.get("channel_post") or update.get("my_chat_member")
        if not isinstance(message, dict):
            continue
        chat = message.get("chat")
        if not isinstance(chat, dict):
            continue
        chat_id = str(chat.get("id", ""))
        if not chat_id or chat_id in seen:
            continue
        seen.add(chat_id)
        chats.append({
            "chat_id": chat_id,
            "type": chat.get("type"),
            "title": chat.get("title"),
            "username": chat.get("username"),
            "first_name": chat.get("first_name"),
            "last_name": chat.get("last_name"),
            "latest_update_id": update.get("update_id"),
        })

    if not chats:
        return print_json({"ok": False, "error": "TELEGRAM_NO_CHATS_FOUND"}, 1)
    return print_json({"ok": True, "chats": chats})


def cmd_send(args: argparse.Namespace) -> int:
    token = read_token()
    chat_id = read_chat_id()
    result = telegram_request(token, "sendMessage", {
        "chat_id": chat_id,
        "text": args.text,
        "disable_web_page_preview": args.disable_preview,
    })
    if not result.get("ok"):
        return print_json({"ok": False, "error": result.get("error", "TELEGRAM_REJECTED")}, 1)
    message = result.get("result") if isinstance(result.get("result"), dict) else {}
    return print_json({"ok": True, "message_id": message.get("message_id")})


def add_vercel_env(name: str, value: str, environment: str, cwd: str) -> tuple[bool, int]:
    process = subprocess.run(
        ["vercel", "env", "add", name, environment, "--force", "--yes"],
        input=value,
        text=True,
        cwd=cwd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return process.returncode == 0, process.returncode


def cmd_configure_vercel(args: argparse.Namespace) -> int:
    token = read_token()
    chat_id = read_chat_id()
    results = []
    for name, value in (("TELEGRAM_BOT_TOKEN", token), ("TELEGRAM_CHAT_ID", chat_id)):
        ok, code = add_vercel_env(name, value, args.environment, args.cwd)
        results.append({"name": name, "ok": ok, "returncode": code})

    all_ok = all(item["ok"] for item in results)
    return print_json({"ok": all_ok, "environment": args.environment, "results": results}, 0 if all_ok else 1)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Safe Telegram Bot API helper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate = subparsers.add_parser("validate", help="Validate TELEGRAM_BOT_TOKEN")
    validate.set_defaults(func=cmd_validate)

    discover = subparsers.add_parser("discover-chat", help="List chats from getUpdates")
    discover.add_argument("--limit", type=int, default=20)
    discover.add_argument("--offset", type=int, default=None)
    discover.set_defaults(func=cmd_discover_chat)

    send = subparsers.add_parser("send", help="Send a plain-text test message")
    send.add_argument("--text", default="CREN Telegram test notification delivered.")
    send.add_argument("--disable-preview", action="store_true", default=True)
    send.set_defaults(func=cmd_send)

    configure = subparsers.add_parser("configure-vercel", help="Add Telegram env vars to Vercel")
    configure.add_argument("--environment", default="production", choices=["production", "preview", "development"])
    configure.add_argument("--cwd", default=".")
    configure.set_defaults(func=cmd_configure_vercel)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return args.func(args)
    except RuntimeError as error:
        return print_json({"ok": False, "error": str(error)}, 1)


if __name__ == "__main__":
    sys.exit(main())
