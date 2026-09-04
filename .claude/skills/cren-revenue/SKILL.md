---
name: cren-revenue
description: The Chief Revenue Officer framework for Columbus Real Estate News — revenue lines, unit economics, readiness gates, pricing discipline, and the weekly revenue rhythm. Use for ANY question about how CREN makes money, whether to launch or price a revenue line, advertiser or sponsor packaging, lead valuation, paid membership, or a CRO directive. Pair with `cren-sales` (how we persuade) and `cren-copywriting` (how we write).
---

# CREN Revenue — CRO Framework

`cren-sales` says how we persuade. This says **what we sell, to whom, at what
price, in what order, and when we are allowed to start.** Where they conflict,
principle 23 wins: never sacrifice long-term trust for quick cash.

## The one number that sets strategy

Measured 30-day audience (2026-09-04): **179 pageviews, 125 unique
visitor-days, 63 search-referred views, 95 live articles, 1 real subscriber,
0 real leads, $0 revenue to date.**

Run the arithmetic before arguing about tactics. At 179 monthly pageviews:

| Line | Generous assumption | Monthly ceiling |
|---|---|---|
| Display ads | $25 CPM | **$4.47** |
| Display ads | $40 CPM | **$7.16** |
| Affiliate | 2% click, 5% convert, $15 each | **$2.69** |

Every audience-monetization line combined is worth **under $10 a month** today.
A single FSBO or investor-seller lead that converts to an acquisition is worth
orders of magnitude more to an investor-operator. So the revenue order is not a
matter of taste, it is arithmetic:

**1. Lead intake → 2. Affiliate → 3. Minimal display ads.**

The CRO's job at this stage is **lead quality and lead conversion**, not
audience monetization. Selling ad inventory now costs more in credibility than
it returns in dollars.

## Revenue lines

### 1. Lead intake (the business)
Four funnels: FSBO seller, investor-property seller, capital partner, renter.
We are investors and operators, so a seller lead is an **acquisition
opportunity**, not a product to resell. Value accrues as equity and cash flow,
not as a referral fee.

- Never resell or broker a lead without the disclosure on the funnel page
  saying so, in advance, in plain English.
- Response time is the product. The site promises one business day; the
  `inquiry_queue` SLA enforces it. A lead answered late is a lead lost, and it
  is the cheapest thing on this list to get right.

### 2. Affiliate
Legitimate programs only, on high-intent utility pages, never inside article
bodies. FTC disclosure above every block, structurally inseparable from the
link. Never remove or demote a comparison option because a competitor pays.

### 3. Display and native advertising
Gated (see below). A native ad must name a **real, signed advertiser**. Seeding
or mocking an ad with a real company's name is prohibited: on 2026-09-04 the
seed data was found asserting "Paid content from Huntington Bank" and a Park
National lending claim, with neither relationship existing. Both were removed.

### 4. Directory, sponsorship, paid membership
Exist in code, deliberately postponed by the owner's 2026-09-04 plan until the
measurement layer and audience justify them.

## Readiness gates (proposals — owner approves before any line opens)

Do not sell a line before its gate. The gate exists so we never sell an
audience we do not have.

| Line | Gate |
|---|---|
| Lead intake | **Open now.** Funnels live, SLA queue live, disclosure live. |
| Affiliate | Open once a real program is joined and its FTC block ships. |
| Display / native | ≥ 5,000 monthly pageviews AND ≥ 250 real members, sustained 2 consecutive months. |
| Newsletter sponsorship | ≥ 500 real subscribers AND a newsletter that has actually shipped 4 consecutive sends. |
| Paid membership | A free tier people demonstrably return to: ≥ 20% 30-day return rate. |
| Media kit with numbers | Only numbers the scorecard produces. See below. |

## The media-kit rule (non-negotiable)

Publish **only** audience numbers the weekly scorecard actually produced, with
their window stated. No projections, no "expected reach," no annualizing one
good week, no aggregate "impressions" that count our own test traffic. If a
prospective advertiser asks for a number we do not have, the answer is "we do
not have that yet" — that answer wins more long-term business in a small market
than an inflated deck, and it is the same standard our journalism is held to.

## Unit economics — REQUIRED FROM THE OWNER

Revenue per 1,000 sessions cannot be computed until these exist. Until then the
scorecard correctly prints `n/a`, and any CRO recommendation that leans on lead
value is unfounded.

1. Average gross profit on a **FSBO acquisition** that closes.
2. Close rate from a **qualified** FSBO lead to a signed deal.
3. Same two figures for an **investor-property acquisition**.
4. What a **capital partner** relationship is worth (per dollar deployed, or per
   partner, however the owner actually thinks about it).
5. Whether a **renter** lead has any direct monetary value, or is purely
   audience-building. This determines whether the renter funnel is a revenue
   line or a top-of-funnel asset, which changes how hard we should push it.
6. Target **cost per qualified lead** we are willing to pay.

With 1–3 alone, the CRO can rank the four funnels by expected value and stop
guessing.

## The three north-star numbers

Owned by the CRO, produced by `npm run newsroom:scorecard`:

1. **Qualified leads per 1,000 sessions** — is journalism producing business?
2. **Free-member conversion rate** — are we building an owned audience?
3. **Revenue/value per 1,000 sessions** — the only number that compounds.

Pageviews matter *because* they feed these. A traffic number reported without
one of these attached is vanity.

## Weekly rhythm

One meeting, five sections, in this order: **Audience → Membership → Leads →
Commercial → Editorial quality**, with leads broken out by the four funnels.
Run it off the scorecard, not off impressions. The question is never "how much
did we publish" but "what did publishing produce."

## Hard rules

- Never fabricate an audience number, a testimonial, an advertiser, a partner
  relationship, or urgency. Trust is the whole asset on a journalism property.
- Never let commercial pressure change a story, a headline, or a ranking.
  Sponsored and partner content is labeled every time.
- No popups, no interstitials, no paywalls on news. Conversion happens at a
  conversion moment, contextually, once per page.
- Test traffic never counts as audience or revenue. Use
  `scripts/test-traffic-lib.mjs`; the `crm-` source prefix is reserved for tests.
- The capital funnel never promises returns and always carries the
  educational/not-an-offer-of-securities line.
- Every number a CRO quotes externally must be traceable to a scorecard run.

## Role boundaries

- **CRO** — owns the three north-star numbers, revenue lines, pricing,
  packaging, and the pipeline. Decides what we sell and when a gate opens.
- **CMO** — owns demand: traffic, audience, positioning, funnel copy.
- **COO** — owns reliability: one identity, one workflow, one lead queue, one
  SLA, one scorecard.
- **CTO** — owns the measurement and data layer first, features second.

Directives follow the format in `directives/README.md`, named
`YYYY-MM-DD-cro.md`. Every claim ties to a scorecard number or is marked as an
assumption.
