# CRE News — Columbus Real Estate News

## Mission
A digital journalism property covering Columbus, Ohio real estate. Daily news, briefs, and SEO-optimized stories spanning the metro and city-wide developments. We use AI to scan sources, surface what's worth covering, draft full stories with proper SEO and image briefs, and listen to what the community wants to hear about.

## Audience
- Columbus real estate investors and operators
- Brokers, agents, and property managers
- Civic and policy watchers
- Residents tracking neighborhood change

## Voice
Local-first journalism. Plain English, fact-forward, low on hype. We're a credible neighborhood paper, not a hot-takes site. Always cite sources. Quotes when we have them.

## Daily cadence
- **06:33 America/New_York** (cloud-scheduled routine — see "Automation" below):
  1. Run `node frontend/scripts/recent-articles.mjs` to see what's already been covered in the last 30 days (avoid duplicate topics).
  2. Research via web search + the source list below. Pull local, government, and national coverage.
  3. Pick 1 real estate story + 1 lifestyle story not already covered.
  4. Verify facts across sources; if a story originates on another outlet, write original local analysis and link back to it (see `.claude/skills/cren-copywriting`).
  5. Draft both articles per the copywriting skill (4th-grade reading level, SEO conventions below).
  6. Insert each article directly into the live `articles` table via `node frontend/scripts/publish-article.mjs <file.json>` — `status='live'`, no manual review step. Set `image_url` to `null`; text publication must not wait on image generation.
  7. Do not call Higgsfield from the cloud routine. A separate idempotent local Codex subscription job invokes built-in `$imagegen`, normalizes each accepted hero to 1600×900 WebP, uploads it to Vercel Blob, and conditionally attaches it to any live row whose `image_url` is still null.
  8. Keep market data fresh (accuracy pass): refresh the ticker as always, then run `DATABASE_URL=... node frontend/scripts/refresh-market-data.mjs` — one command that pulls FREE public feeds (Zillow Research ZHVI for the neighborhood "Typical Value" column + YoY, Zillow ZORI for rents, FRED for the 30-yr mortgage rate) and updates the DB automatically. No API keys, no scraping. It only writes what it can resolve and leaves the rest unchanged, so it never fabricates. (Short North, Clintonville, and Franklinton aren't in Zillow's neighborhood file — leave their prior values or update from a named source if you find one; never guess.) The metro Median Sale Price / Active Listings / Days on Market in the snapshot come from the Columbus REALTORS monthly report — update those from that report via `update-site-data.mjs` (`market_snapshot` key) when a new month is out.
  9. Write a brief to `briefs/<date>.md` summarizing sources used, links to the two new articles, and which neighborhood rows you refreshed, then commit and push.
- New articles appear on the live site within 5 minutes (blog pages use `revalidate = 300`) — no redeploy needed per run.

## Automation
The daily text run above executes as a cloud-scheduled Claude Code routine (not a local cron job — see `claude.ai/code/routines`). It authenticates to NeonDB via a `DATABASE_URL` embedded in the routine's own configuration (not committed to this repo). Image generation is deliberately separate: the local `com.cren.image-backfill` LaunchAgent uses the saved Codex/ChatGPT subscription, never an OpenAI API key, and retries at 7:05 a.m., 8:05 a.m., and 12:35 p.m. Eastern.

## Channels
Blog (primary — inserted directly into the `articles` table, live). `content/<channel>/<date>.md` markdown drafts are kept for LinkedIn/Instagram/X/Threads distribution copy, written after the blog article is live.

## Source list (kept current)

### Local news
- Columbus Business First
- Columbus Dispatch (real estate section)
- Columbus Underground
- ColumbusRealEstate.com listings deltas
- ULI Columbus events

### Local & state government
- City of Columbus (development announcements, zoning, public notices — columbus.gov)
- Franklin County Auditor and Franklin County Commissioners
- Mid-Ohio Regional Planning Commission (MORPC)
- State of Ohio: ohio.gov, Ohio Department of Development, Ohio Housing Finance Agency

### National coverage
- Search-driven, not a fixed outlet list: scope web searches to "Columbus, Ohio" real estate, development, or lifestyle news on national outlets (e.g. when Columbus shows up in national housing-market, migration, or economic-development coverage).

- (add Twitter/X handles, neighborhood Facebook groups, etc.)

### Sourcing etiquette (applies to all scraping/fetching)
- Prefer official RSS feeds, press-release pages, and public APIs over scraping article HTML.
- Respect robots.txt and paywalls: never reproduce paywalled text; cite the headline and link instead.
- One fetch per page per run — no crawling, no hammering a site with repeated requests.
- Government sources (columbus.gov, ohio.gov, county sites) are public record and the most reliable primary sources — prefer them for facts, and use news outlets for context and quotes.
- Every fact in a published article must be traceable to a specific fetched source. No memory-only claims.

## SEO conventions
- Title: front-load Columbus + neighborhood + asset class
- Meta description: 150–160 chars, lead with the news
- Tags: include `columbus-ohio`, `central-ohio-real-estate`, neighborhood, asset class
- Internal links: cross-link to prior coverage of same neighborhood/operator
- Image briefs: 1 hero (16:9), 1 social (1:1), one inline supporting image

## Inbox sources
- Tips line (Gmail tag `cren/tip`)
- Press releases from local developers + brokerages
- City of Columbus public notices
- Reader feedback

## Capabilities
- L2 skills: `daily-news-scan`, `seo-blog-writer`, `social-content-writer`, `image-prompt-writer`
- L3 chains: `daily-cre-newsroom`
- L4 subagents: `journalist-researcher`, `social-listener`
- L5 team: **`cre-newsroom-orchestrator`** — coordinates journalist-researcher, decision-queue, seo-blog-writer, social-listener, comms-manager
