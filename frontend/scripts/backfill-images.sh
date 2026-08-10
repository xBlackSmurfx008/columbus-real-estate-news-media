#!/usr/bin/env bash
# Compatibility wrapper. The durable implementation uses the saved Codex/ChatGPT
# subscription and built-in $imagegen; it never requires Higgsfield or an OpenAI API key.
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"
exec node scripts/run-image-backfill.mjs "$@"
