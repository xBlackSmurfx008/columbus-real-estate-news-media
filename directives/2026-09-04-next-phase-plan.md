# Next-phase plan — from measurement to revenue

Written 2026-09-04, after the owner's 12-item operating plan was built. This is
the go-forward plan and the handoff into a Chief Revenue Officer function.
Framework: `.claude/skills/cren-revenue/SKILL.md`.

## Where we actually are

Measured, not estimated (production, 2026-09-04):

| | |
|---|---|
| Live articles | 95 |
| Pageviews, 30 days | 179 |
| Unique visitor-days, 30 days | 125 |
| Search-referred views, 30 days | 63 |
| Real subscribers | 1 (the owner) |
| Real leads, all time | 0 |
| Real affiliate clicks, all time | 0 |
| Revenue to date | $0 |

The product is now instrumented, consistent, and honest. It is not yet a
business. That is the correct order, and it is where the CRO picks up.

## The arithmetic that sets the sequence

At 179 monthly pageviews, every audience-monetization line combined is worth
**under $10 a month** (display at a generous $25 CPM: $4.47; affiliate at 2%
click / 5% convert / $15: $2.69). One FSBO or investor-seller lead that
converts to an acquisition is worth orders of magnitude more to an
investor-operator.

So the order is not preference, it is arithmetic:
**lead intake → affiliate → minimal display ads.** Selling ad inventory at this
audience costs more credibility than it returns in dollars. The gates in the
revenue skill exist to stop us doing it.

## Phase 1 — make it live and make it heard (next 30 days)

The measurement layer is built. Two things now decide whether it matters.

1. **Deploy.** Verified today: production still serves the old article CTA with
   the false "every Tuesday" newsletter promise. Every fix from today — honest
   CTAs, canonical market data, funnel telemetry, the SLA queue, disclosures —
   is in `main` and **not yet in front of a reader.** This is the single
   highest-value action available and it is not a code problem.
2. **Traffic.** Google organic is the only real channel (63 of 179 views).
   Event-timed publishing is the only proven amplifier: the Aug 27 Sugar
   opening drove 50 pageviews in one day for a story published two days early.
   The coverage calendar (dates already in our own stories: Downtown Commission
   demolition vote Sep 22, Zone In comment close Oct 24, Christkindlmarkt
   Nov 21) turns that from luck into a habit.
3. **First real lead.** Zero is the number that matters. With CTAs, funnels,
   disclosure and an SLA queue all live, the first genuine inquiry is the
   milestone that proves the whole chain end to end.

## Phase 2 — stand up the CRO function (30–60 days)

The CRO cannot operate on judgment alone; they need unit economics. Blocking
inputs, owner-supplied (see the revenue skill for the full list):

- Gross profit on an FSBO acquisition that closes, and the close rate from a
  qualified lead. Same for an investor-property acquisition.
- What a capital-partner relationship is worth.
- Whether a renter lead has direct monetary value or is purely top-of-funnel.
  This single answer decides whether the renter funnel is a revenue line or an
  audience asset, and it changes how hard we push it.

With those, the CRO ranks the four funnels by expected value and stops
guessing. Without them, "revenue per 1,000 sessions" correctly reads `n/a`.

Also required before any commercial conversation:
- The five commercial-disclosure facts still open from item 6 (the entity that
  buys property, whether we own or manage rentals today, current referral
  compensation, licensure, capital-side fee intent).
- Affiliate programs actually joined, so the affiliate mechanism has something
  real to point at.

## Phase 3 — open revenue lines against their gates (60–90 days)

Lead intake is open now. Everything else waits for its gate in the revenue
skill: affiliate on a real signed program; display and native at 5,000 monthly
pageviews and 250 real members sustained two months; newsletter sponsorship
only after a newsletter has actually shipped four consecutive sends; paid
membership only once the free tier shows a 20% 30-day return rate.

The media-kit rule holds throughout: publish only numbers the weekly scorecard
produced, with their window stated. In a market this small, "we don't have that
yet" wins more long-term business than an inflated deck.

## Governance

- Weekly: one meeting off `npm run newsroom:scorecard` — Audience → Membership
  → Leads → Commercial → Editorial quality, leads split by the four funnels.
- CRO owns the three north-star numbers: qualified leads per 1,000 sessions,
  free-member conversion, revenue/value per 1,000 sessions.
- CMO owns demand, COO owns reliability, CTO keeps the data layer trustworthy
  before adding features.
- CRO directives: `directives/YYYY-MM-DD-cro.md`, same format as the CMO's.

## Correction logged today

The seed data (`lib/db.ts`) shipped two native ads branded **Huntington Bank**
and **Park National Bank** with `status: 'live'` and invented product claims
("Expanding down payment assistance to qualified buyers in Franklin, Delaware,
and Licking counties"). Neither is an advertiser. The homepage renders a native
ad as "Paid content from <brand>", so any seed run would have asserted a paid
relationship with a real financial institution and attributed lending claims to
them we cannot support.

Verified they were **not** rendering publicly (the fetch filters `status='live'`
while the stored rows read `'active'`), so no reader saw them. Both were removed
from `seedData()` and deleted from production, full records preserved in the
session log. Only unbranded, empty display slots are seeded now; a native ad
must be created deliberately against a real signed advertiser.

This is the rule the revenue skill now encodes: never seed, mock, or demo an
advertiser using a real company's name.
