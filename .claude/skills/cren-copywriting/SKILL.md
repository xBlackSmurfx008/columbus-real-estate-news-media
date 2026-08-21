---
name: cren-copywriting
description: Source-first editorial standard and publication gate for Columbus Real Estate News. Use this for every CREN article, brief, draft, headline, and image brief.
---

# CRE News — Copywriting Standard

## Plain, intelligent language

- Write for an intelligent Columbus reader who is not a real-estate specialist. Do not target a fixed grade level.
- Prefer one idea per sentence and vary sentence length so the copy does not sound clipped or machine-made.
- Common words over jargon. If a real estate or policy term is unavoidable ("days on market," "zoning variance," "absorption rate"), define it in plain language the first time it appears.
- Active voice. "The city approved the permit," not "The permit was approved by the city."
- No stacked clauses. Break long sentences into two short ones.
- Read the draft aloud. Rewrite passages that sound like a press release, a school report, or generic AI copy.

## Article shape

- Do not write to an arbitrary word count. Stop when the reader's question and the important follow-ups are fully answered.
- Open with a 30–60 word answer summary: what happened, where, and why it matters. No warm-up paragraph.
- Use 3–7 descriptive H2s. Avoid formula headings such as “Introduction,” “What it means for investors,” and “The takeaway.”
- Add one truthful, story-specific scene, tension, object, comparison, record cross-check, timeline, or calculation. CREN must add value beyond rearranging another outlet's reporting.
- Keep paragraphs under 120 words and place source links beside the claims they support.
- Excerpt: 140–165 characters and written independently from the opening.
- Include at least one internal link to a relevant `/areas/<slug>` or `/topics/<slug>` page when one fits naturally.

## Voice (from repo CLAUDE.md)

Local-first journalism. Calm, neighborly, curious, and fact-forward. Credible neighborhood paper, not a hot-takes site,
brokerage funnel, or press-release rewrite. Never insert lead-generation copy or tell readers a project is an investment signal.

## Verification

- Use at least two independent fetched sources and at least one primary record, official filing/release, or direct interview.
- If a claim is single-sourced, say so plainly in the piece (e.g., "According to [Source], ...") rather than presenting it as independently confirmed.
- Do not state a number or date you can't trace back to a specific source.
- Submit `source_ledger`, `claim_ledger`, and `entity_ledger` metadata with the article JSON. Every material numeric or status claim must appear verbatim in the claim ledger and map to a source ID.
- Follow `frontend/docs/article-submission.schema.json` exactly; it is the machine contract for staging.
- Label proposals, filings, recommendations, approvals, construction, completion, and sales precisely. Do not turn an application into an approval or an announced timeline into certainty.

## Neighborhood lane

- Target one strong Neighborhoods article per Monday-to-Sunday week; publish a second only for a distinct, well-sourced story. Never exceed two in a week.
- Run `npm run newsroom:neighborhood-report` from `frontend/` and follow `frontend/docs/NEIGHBORHOOD_NEWSROOM.md`.
- Every Neighborhoods article needs one specific non-citywide `area_slug` and tags for `columbus-ohio`, `central-ohio-real-estate`, its topic, its area, and `neighborhood`.
- Start with a dated primary record: permit, zoning filing/result, ordinance, parcel/deed record, public project milestone, school record, transportation plan, or official dataset. Add an independent second source and link the exact record.

## Attribution and rewriting

- If a story is already covered by another outlet or blog, do not copy their language, structure, or framing.
- Write original local reporting value: a record cross-check, timeline, calculation, parcel/process explanation, comparison, interview, or clearly labeled inference.
- Always link back to the original source inline (e.g., "as first reported by Columbus Business First") when a story originates elsewhere.
- Never present another outlet's reporting as the site's own original reporting.

## SEO conventions (from repo CLAUDE.md)

- Title: 45–75 characters and accurately promise one useful result. Use a place name naturally; do not stuff Columbus into every title.
- Meta description: 140–165 characters, lead with the answer.
- Tags: include `columbus-ohio`, `central-ohio-real-estate`, neighborhood, asset class.
- Internal links: cross-link to prior coverage of the same neighborhood/operator.
- Image brief: define one editorial idea and at least two story-specific visual anchors. Prefer a licensed real photo,
  official plan/rendering, public-record map, or CREN-made data graphic. If AI is justified, request a clearly illustrative
  CREN house style—not a fake documentary photograph—and caption it “AI-generated illustration.” Reject handshakes, keys,
  money, arrows, glowing houses, hardhat-and-blueprint still lifes, glass towers, skyline montages, and invented properties.

## Publication decision

- Owner policy (2026-08-14, reaffirmed live 2026-08-17): no human pre-publish approval, ever. We make them, we create
  them, we send them. `publish-article.mjs` runs the deterministic checks and publishes `status='live'` immediately.
- The deterministic quality gate (claim traceability, SEO metadata, duplicate guard, hero requirement) is the only gate.
  A draft that fails it gets fixed until it passes, in the same run.
- Review happens post-publish: if a problem is found in a live article, fix or unpublish it. Never hold the queue.
