# CREN Verified Audience and Media Kit Baseline

As of: 2026-08-29
Command used: `node --env-file=.env.production.local scripts/kpi-report.mjs --window 30`
Scope: production database, last 30 days, controlled `codex-smoke` rows excluded.

## Verified Numbers

| Metric | Verified value |
| --- | --- |
| Server-side pageviews | 104 |
| Daily-rotating unique visitors | 66 |
| Non-smoke subscribers | 1 |
| Free members | 0 |
| Contact messages | 1 |
| Real leads | 0 |
| Articles published in the 30-day window | 42 |
| Affiliate clicks in window | 6 total: 4 renters-insurance, 2 mortgage-rates |
| Area follows started | 1 |
| Preferences saved | 0 |
| Activation form submissions | 0 |
| Renter checklist starts/completions | 1 start, 0 completions |

## Sales Accuracy Rules

- Do not claim `10,000+ subscribers`, `58% open rate`, large traffic, or lead quality until verified by production analytics, newsletter platform reporting, or advertiser-grade logs.
- Current media kit language should sell founding placement, Columbus housing relevance, product clarity, labels, and reporting structure instead of inflated audience scale.
- Public packages may show pilot pricing and deliverables, but final pricing should be tied to available inventory, reporting confidence, production traffic, newsletter data, and renewal outcomes.
- Every advertiser-facing report should state the metric source and limitation.
- Controlled smoke rows must be excluded from audience, lead, and conversion totals.

## Accurate Public Positioning

CREN can truthfully sell:

- A Columbus-specific housing, apartment, neighborhood, development, and local-service audience strategy.
- Source-labeled market data and editorial context.
- Clearly labeled advertising placements.
- Profile claim and update workflows.
- Early-stage sponsor pilots with reporting snapshots.
- A managed-sales model that can mature into self-service advertising after data, checkout, refund, and review workflows prove stable.

CREN should not yet sell:

- Guaranteed impressions, leads, leases, closings, applications, subscribers, rankings, placements, or editorial coverage.
- Pay-per-lease, pay-per-closing, referral-fee, lending, insurance, brokerage, or capital-introduction products without counsel and a signed operating model.
- Rankings, superlatives, or "best" claims without a published methodology and review process.

## Media Kit Status

The public media-kit page exists at `/advertise/media-kit`. It intentionally avoids unverifiable audience-size claims and presents:

- Product sheets.
- Rate-card posture.
- Required advertiser materials.
- Claim substantiation requirements.
- Sponsor labels.
- Campaign reporting example.
- Apartment and service-provider pilot package.
