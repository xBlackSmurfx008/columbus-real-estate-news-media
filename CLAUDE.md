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
- **06:33**: `cre-newsroom-orchestrator` (L5) runs:
  - `journalist-researcher` scans 5+ sources, dedupes, writes briefs to `briefs/<date>.md`
  - `decision-queue` ranks stories: cover today / cover later / skip
  - `seo-blog-writer` drafts the chosen story with SEO meta + image briefs to `content/blog/<slug>.md`
- **16:43**: `social-listener` recap — what's Columbus talking about
- **Weekly Sun**: SEO performance + topic-gap report

## Channels
Blog (primary), then LinkedIn, Instagram, X, Threads for distribution. Drafts in `content/<channel>/<date>.md`. Blog posts in `content/blog/`.

## Source list (kept current — used by `journalist-researcher`)
- Columbus Business First
- Columbus Dispatch (real estate section)
- Columbus Underground
- ColumbusRealEstate.com listings deltas
- City of Columbus development announcements
- ULI Columbus events
- (add Twitter/X handles, neighborhood Facebook groups, etc.)

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
