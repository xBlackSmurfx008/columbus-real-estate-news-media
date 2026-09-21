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
  1. Start a durable run record with `cd frontend && node scripts/newsroom-run.mjs start --source claude-cloud`. Preserve the returned `run_id` as `CREN_NEWSROOM_RUN_ID` for this run. If the routine cannot start this record, stop and report the failure; an unobservable run is not healthy.
  2. Run `node frontend/scripts/recent-articles.mjs` to see what's already been covered in the last 30 days (avoid duplicate topics).
  3. Run `cd frontend && npm run newsroom:neighborhood-report`. Maintain one strong Neighborhoods article each Monday-to-Sunday week and allow a second only when a distinct, source-backed story earns it. Never exceed two. Follow `frontend/docs/NEIGHBORHOOD_NEWSROOM.md`.
  4. Run `cd frontend && DATABASE_URL=... npm run newsroom:coverage-calendar`. It prints what is due today, what has slipped, what lands in the next 14 days, and what we have missed, ranked, with one suggested pick per slot. Paste the block into today's brief and start from it — publishing two days ahead of a dated event is the only traffic amplifier we have measured. A calendar entry is a peg, not a story: verify it against a live source, and if the date has moved, `coverage-calendar.mjs cancel` it and publish nothing. Follow `frontend/docs/COVERAGE_CALENDAR.md`; every entry cites the article or brief its date came from, and new dates found today should be added to `frontend/content/coverage-calendar/seed.json` the same way.
  5. Research via web search + the source list below. Pull local, government, and national coverage.
  6. Pick at most 1 strong real estate story and 1 strong lifestyle story not already covered. A Neighborhoods story consumes the real-estate slot. Publish zero rather than force a weak or duplicative daily item.
  7. Verify facts across sources; if a story originates on another outlet, write original local analysis and link back to it (see `.claude/skills/cren-copywriting`).
  8. Draft each worthwhile article and its source, claim, entity, SEO, tag, and image metadata per `frontend/prompts/ARTICLE_WRITING.md` and `frontend/docs/article-submission.schema.json`. Body format is Markdown only. Return `NEEDS_REPORTING` instead of filling evidence gaps.
  9. Run `node frontend/scripts/publish-article.mjs <file.json> --run-id "$CREN_NEWSROOM_RUN_ID"`. This command stages `status='draft'` after the deterministic gate passes. It cannot publish. Never bypass it or write a live row directly.
  10. Hero requirement: the image worker attaches a durable, reachable, story-specific hero with a unique content fingerprint to the non-public draft. Local `/images/heroes/` paths and placeholder cards are not publication images. The article remains a draft until an authenticated editor approves the exact copy-image pair with the ten-part scorecard.
  10a. Email review loop. For every `READY_FOR_REVIEW` candidate, run `npm run newsroom:email-review -- send --article-id <id> --confirm send-editorial-proof` with the configured production environment. If the latest status is `CHANGES_REQUESTED`, apply the stored reply to the tracked source package and production draft, rerun the deterministic gate, and send a new proof. Never interpret requested edits as approval. Only the exact latest candidate may become `APPROVED` after a standalone approval reply from the configured editor; authenticated publication performs all gates again.
  11. Keep market data fresh (accuracy pass): refresh the ticker as always, then run `DATABASE_URL=... node frontend/scripts/refresh-market-data.mjs` — one command that pulls FREE public feeds (Zillow Research ZHVI for the neighborhood "Typical Value" column + YoY, Zillow ZORI for rents, FRED for the 30-yr mortgage rate) and updates the DB automatically. No API keys, no scraping. It only writes what it can resolve and leaves the rest unchanged, so it never fabricates. (Short North, Clintonville, and Franklinton aren't in Zillow's neighborhood file — leave their prior values or update from a named source if you find one; never guess.) The metro Median Sale Price / Active Listings / Days on Market in the snapshot come from the Columbus REALTORS monthly report — update those from that report via `update-site-data.mjs` (`market_snapshot` key) when a new month is out. Both refresh scripts and `update-site-data.mjs` now re-export `frontend/content/snapshot/public-data.json` automatically, so the DB-outage fallback can never drift behind the database — commit that file with the refresh. Finish the pass with `DATABASE_URL=... npm run verify:market-consistency` (in `frontend/`); it fails if the database, the committed fallback, or `hero_stats` disagree about any metric. All public market numbers come from one canonical module, `frontend/lib/market-data.ts` — never read `market_snapshot`, `market_observations`, or `hero_stats` directly in a page or component.
  12. Health check. From `frontend/`: `npm run newsroom:uptime`, then `DATABASE_URL=... npm run verify:site -- --target production`. Record the result in the brief every day, including when everything passes — a silent pass is what a broken monitor looks like. Escalate in the brief and by push notification if the homepage or `/blog` renders zero articles, if `verify:site` reports a new blocking failure, or if either command cannot run at all. Production also runs `/api/cron/newsroom-health` on Vercel every day. `.github/workflows/newsroom-health.yml` is a third monitor when GitHub runners are available, but it is not evidence until a scheduled run is observed: this account's older workflow runs failed before runner assignment.
  13. Finish the durable record. Use `cd frontend && node scripts/newsroom-run.mjs complete --run-id "$CREN_NEWSROOM_RUN_ID" --story-result STAGED` when at least one draft was staged, or `cd frontend && node scripts/newsroom-run.mjs complete --run-id "$CREN_NEWSROOM_RUN_ID" --story-result NO_QUALIFYING_STORY` when the evidence justified publishing nothing. On an operational failure, use `cd frontend && node scripts/newsroom-run.mjs fail --run-id "$CREN_NEWSROOM_RUN_ID" --reason <safe-code>` before exiting.
  14. Write a brief to `briefs/<date>.md` summarizing sources used, staged draft review links, which neighborhood rows you refreshed, and the health result, then commit and push.
- Publication policy (owner update, 2026-09-21): automation stages only. A story becomes live only after the deterministic gate passes, a durable unique hero is attached, and an authenticated editor explicitly approves the exact candidate with a passing human scorecard. Publication proofs and correction requests use the signed email reply loop; Telegram remains the operational alert channel for failures, approvals, and reports.

## Automation
The daily text run above executes as a cloud-scheduled Claude Code routine (not a local cron job — see `claude.ai/code/routines`). It authenticates to NeonDB through the routine configuration. The repository is the safety boundary: `publish-article.mjs` can only create a draft. Image preparation cannot publish. Only the authenticated admin route can transition a draft to live, and only after machine, image, fingerprint, exact-copy, and human-review gates pass.

## Channels
Daily runs stage gate-passing drafts in the `articles` table. Publication and public social copy require authenticated human approval.

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
