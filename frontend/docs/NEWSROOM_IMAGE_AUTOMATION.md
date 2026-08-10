# CREN newsroom image automation

Claude may stage machine-passed drafts, but it cannot publish. The local image job is intentionally separate and can
only prepare a hero for a non-public draft. An authenticated editor approves copy and image together.

## Image path

1. `list-missing-images.mjs` selects only drafts whose deterministic editorial report is complete, then chooses the
   newest missing hero plus the oldest backlog items. It atomically claims each job before launching Codex, so scheduled
   and manual runs cannot generate the same hero concurrently, and creates durable `article_image_jobs` rows for observability.
2. `run-image-backfill.mjs` verifies saved Codex/ChatGPT authentication and launches an ephemeral Codex job. It removes
   `OPENAI_API_KEY` and `CODEX_API_KEY` from the child environment.
3. The agent follows `prompts/IMAGE_BACKFILL.md` and explicitly invokes built-in `$imagegen` once per article. Prompts
   use a clearly illustrative CREN house style, two required story anchors, and a scored rejection gate. Generic AI
   stock art and invented local specificity are prohibited.
4. `attach-article-image.mjs` inspects the source, smart-crops it to 1600×900, converts it to WebP, hashes it, uploads it
   to the public `cren-newsroom-images` Vercel Blob store, verifies the URL, and updates only a draft whose
   `image_url` is still null. The job status becomes `READY_FOR_REVIEW`, never live.
5. Telegram reports terminal success/failure with authenticated review links. A daily
   zero-publish alert is deduplicated in PostgreSQL. The same health check alerts if any public article is ever found
   without a hero image; run `npm run newsroom:audit-public-images` for a manual assertion.

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
