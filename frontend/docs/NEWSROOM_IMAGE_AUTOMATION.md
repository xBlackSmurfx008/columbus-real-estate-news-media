# CREN newsroom image automation

Text publication remains the Claude cloud routine's responsibility and must happen before image work. The local image
job is intentionally separate so a generation outage cannot block a verified article from going live.

## Image path

1. `list-missing-images.mjs` queries the live `articles` table and selects the newest missing hero plus the oldest
   backlog items. It creates durable `article_image_jobs` rows for observability.
2. `run-image-backfill.mjs` verifies saved Codex/ChatGPT authentication and launches an ephemeral Codex job. It removes
   `OPENAI_API_KEY` and `CODEX_API_KEY` from the child environment.
3. The agent follows `prompts/IMAGE_BACKFILL.md` and explicitly invokes built-in `$imagegen` once per article. Prompts
   share one natural Central Ohio editorial art direction and prohibit text, logos, exact unverified locations, and
   generic skyline filler.
4. `attach-article-image.mjs` inspects the source, smart-crops it to 1600×900, converts it to WebP, hashes it, uploads it
   to the public `cren-newsroom-images` Vercel Blob store, verifies the URL, and updates only a live row whose
   `image_url` is still null.
5. Telegram reports terminal success/failure with live `https://columbusrealestatenews.com/blog/...` links. A daily
   zero-publish alert is deduplicated in PostgreSQL.

## Schedule and commands

The macOS LaunchAgent attempts image recovery at 7:05 a.m., 8:05 a.m., and 12:35 p.m. Eastern. Later attempts are
idempotent. Install or refresh it with:

`npm run newsroom:install-image-schedule`

Run manually with the default limit of four:

`npm run newsroom:image-backfill`

For a bounded backlog recovery:

`npm run newsroom:image-backfill -- --limit 12`

The machine must be awake, online, signed into Codex with ChatGPT, and have a mode-600 `.env.local` containing
`DATABASE_URL`, Vercel Blob credentials, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID`. No OpenAI API key is used.
