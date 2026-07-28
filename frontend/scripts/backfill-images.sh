#!/usr/bin/env bash
# Self-healing image backfill: generate + attach a 16:9 hero image for EVERY live
# article that is missing one. Safe to run anytime — it only touches NULL-image rows,
# so running it repeatedly is a no-op once everything has an image.
#
# Why this exists: the cloud routine publishes imageless whenever its Higgsfield
# credential (HIGGSFIELD_CREDENTIALS_B64) is stale. This script closes that gap from
# the local machine, which has a working `higgsfield` login, so the site is never
# left with imageless articles regardless of the cloud's image state.
#
# Requires: local `higgsfield` CLI logged in (`higgsfield account status`), and
# frontend/.env.local with DATABASE_URL. Run from anywhere: bash scripts/backfill-images.sh
set -uo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)" || exit 1   # -> frontend/
ENVFILE=.env.local

# Ensure node/higgsfield resolve when launched by launchd/cron (minimal PATH).
for d in "$HOME"/.nvm/versions/node/*/bin /opt/homebrew/bin /usr/local/bin; do
  [ -d "$d" ] && case ":$PATH:" in *":$d:"*) ;; *) PATH="$d:$PATH";; esac
done
export PATH

# Portable timeout: macOS lacks `timeout` (GNU coreutils); fall back to gtimeout, else run bare.
run_to() {
  local secs="$1"; shift
  if command -v timeout >/dev/null 2>&1; then timeout "$secs" "$@"
  elif command -v gtimeout >/dev/null 2>&1; then gtimeout "$secs" "$@"
  else "$@"; fi
}

if ! run_to 30 higgsfield account status >/dev/null 2>&1; then
  echo "Higgsfield CLI not logged in (run: higgsfield auth login). Aborting — no images changed."
  exit 1
fi

# bash 3.2 (macOS default) has no mapfile — stream rows through a temp file instead.
ROWS_FILE=$(mktemp)
node --env-file="$ENVFILE" -e '
import("@neondatabase/serverless").then(async ({neon})=>{
  const sql=neon(process.env.DATABASE_URL);
  const r=await sql`SELECT id,title FROM articles WHERE status='"'"'live'"'"' AND image_url IS NULL ORDER BY created_at DESC`;
  for(const x of r) console.log(x.id+"\t"+x.title);
});' 2>/dev/null > "$ROWS_FILE"

if [ ! -s "$ROWS_FILE" ]; then echo "All live articles already have images. Nothing to do."; rm -f "$ROWS_FILE"; exit 0; fi
echo "Found $(wc -l < "$ROWS_FILE" | tr -d ' ') article(s) missing an image."

RESULTS=$(mktemp)
while IFS=$'\t' read -r id title; do
  [ -z "$id" ] && continue
  echo "-> $title"
  out=$(run_to 220 higgsfield generate create gpt_image_2 \
    --prompt "Photorealistic editorial news photo: ${title}. Natural colors, documentary photography style. No text, no watermark." \
    --aspect_ratio 16:9 --resolution 2k --wait --json 2>/dev/null)
  url=$(echo "$out" | grep -oE 'https://[a-zA-Z0-9./_-]+\.png' | head -1)
  if [ -n "$url" ]; then echo "$id|$url" >> "$RESULTS"; echo "   ok"; else echo "   FAILED (left imageless)"; fi
done < "$ROWS_FILE"
rm -f "$ROWS_FILE"

if [ -s "$RESULTS" ]; then
  node --env-file="$ENVFILE" scripts/set-article-images.mjs "$RESULTS"
else
  echo "No images generated this run."
fi
rm -f "$RESULTS"
