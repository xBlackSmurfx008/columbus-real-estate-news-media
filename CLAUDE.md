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
  6. Generate one hero image per article via Higgsfield.
  7. Insert each article directly into the live `articles` table via `node frontend/scripts/publish-article.mjs <file.json>` — `status='live'`, no manual review step.
  8. Keep market data fresh (accuracy pass): refresh the metro snapshot/ticker as always, AND rotate through the 14 rows of the `neighborhoods` table refreshing ~3 per run so all 14 stay current within a week. Source: **Redfin's per-city/neighborhood housing-market pages** (e.g. `redfin.com/city/5847/OH/Dublin/housing-market`, `redfin.com/neighborhood/152473/OH/Columbus/Clintonville/housing-market`) — they publish monthly medians, YoY, and days-on-market. Cross-check against Zillow/Rocket when possible. Apply via `node frontend/scripts/update-site-data.mjs <file.json>` using the `neighborhoods` key; set any field you cannot verify to `"UNVERIFIED"` (the script leaves those unchanged) and NEVER guess a figure. Small-neighborhood medians are volatile — prefer the source's 3-month figure where offered.
  9. Write a brief to `briefs/<date>.md` summarizing sources used, links to the two new articles, and which neighborhood rows you refreshed, then commit and push.
- New articles appear on the live site within 5 minutes (blog pages use `revalidate = 300`) — no redeploy needed per run.

## Automation
The daily run above executes as a cloud-scheduled Claude Code routine (not a local cron job — see `claude.ai/code/routines`). It authenticates to NeonDB via a `DATABASE_URL` embedded in the routine's own configuration (not committed to this repo) and uses the Higgsfield MCP connector for image generation.

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
