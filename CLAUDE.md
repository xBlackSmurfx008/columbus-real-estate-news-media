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
  2. Run `cd frontend && npm run newsroom:neighborhood-report`. Maintain one strong Neighborhoods article each Monday-to-Sunday week and allow a second only when a distinct, source-backed story earns it. Never exceed two. Follow `frontend/docs/NEIGHBORHOOD_NEWSROOM.md`.
  3. Research via web search + the source list below. Pull local, government, and national coverage.
  4. Pick at most 1 strong real estate story and 1 strong lifestyle story not already covered. A Neighborhoods story consumes the real-estate slot. Publish zero rather than force a weak or duplicative daily item.
  5. Verify facts across sources; if a story originates on another outlet, write original local analysis and link back to it (see `.claude/skills/cren-copywriting`).
  6. Draft each worthwhile article and its source, claim, entity, SEO, tag, and image metadata per `frontend/prompts/ARTICLE_WRITING.md` and `frontend/docs/article-submission.schema.json`. Body format is Markdown only. Return `NEEDS_REPORTING` instead of filling evidence gaps.
  7. Run `node frontend/scripts/publish-article.mjs <file.json>`. This command stages a non-public `status='draft'` candidate after deterministic checks. Never bypass the script, write a row directly, or change the staged article to `live` from the routine.
  8. Hero requirement: the exact draft must receive a durable, reachable, story-specific hero with a unique content fingerprint before it can enter human approval. Local `/images/heroes/` paths and generic fallback cards are not publication images. Image attachment may update a draft, but it may not publish it.
  9. Keep market data fresh (accuracy pass): refresh the ticker as always, then run `DATABASE_URL=... node frontend/scripts/refresh-market-data.mjs` — one command that pulls FREE public feeds (Zillow Research ZHVI for the neighborhood "Typical Value" column + YoY, Zillow ZORI for rents, FRED for the 30-yr mortgage rate) and updates the DB automatically. No API keys, no scraping. It only writes what it can resolve and leaves the rest unchanged, so it never fabricates. (Short North, Clintonville, and Franklinton aren't in Zillow's neighborhood file — leave their prior values or update from a named source if you find one; never guess.) The metro Median Sale Price / Active Listings / Days on Market in the snapshot come from the Columbus REALTORS monthly report — update those from that report via `update-site-data.mjs` (`market_snapshot` key) when a new month is out.
  10. Write a brief to `briefs/<date>.md` summarizing sources used, staged draft review links, and which neighborhood rows you refreshed, then commit and push.
- Publication policy (owner update, 2026-08-21): automation stages only. An authenticated human must inspect the exact headline, dek, body, evidence links, and durable hero together, pass the current 17/20 rubric, approve the image, and explicitly publish. The owner prefers Telegram (not email) for notifications about drafts, errors, and reports.

## Automation
The daily text run above executes as a cloud-scheduled Claude Code routine (not a local cron job — see `claude.ai/code/routines`). It authenticates to NeonDB via a `DATABASE_URL` embedded in the routine's own configuration (not committed to this repo). The repository gate is the safety boundary: even if routine instructions drift, `publish-article.mjs` stages only. A Vercel Workflow will replace the local image LaunchAgent after cloud image generation and production verification succeed.

## Channels
Daily runs stage candidates in the `articles` table. Publication and public social copy happen only after authenticated human approval.

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
- Image briefs: one 16:9 editorial hero concept with an explanatory idea, two story-specific anchors, truthful
  provenance/caption, local constraints, and an explicit avoid list. Social and inline images are downstream work.

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
