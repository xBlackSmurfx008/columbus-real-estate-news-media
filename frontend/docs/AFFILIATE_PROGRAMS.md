# Affiliate programs — current state and what the owner must join

**As of 2026-09-04, Columbus Real Estate News has no affiliate relationship with
any company.** Zero programs joined, zero tracking IDs issued, zero commissions
earned, zero affiliate clicks ever recorded from a real reader.

That is not a gap in the code. The mechanism shipped; the *relationships* have
not been entered into, and only the owner can enter into them. This file says
exactly what is built, what is missing, and what has to happen for a dollar to
move.

## What the audit found

All 8 rows ever written to `affiliate_clicks` were our own automated test
traffic on `/resources`, several in identical-second pairs. Every one is now
flagged `is_test = true`. The 5 rows in `affiliate_partners` are placeholder
seeds pointing at `example.com` and have never been reachable: both the block
and the `/go` redirect refuse a placeholder URL.

## What is built

- `lib/outbound-partners.ts` — the registry of destinations CREN sends readers
  to from its utility pages. Plain public URLs only. No tracking parameter,
  affiliate URL, or network name appears anywhere in code.
- `affiliate_programs` (table) — the one place a real relationship is recorded.
  Seeded with one `status = 'unconfigured'` row per partner and no IDs.
- `resolveAffiliateUrl()` — refuses to produce a paid link unless the row is
  `active`, carries a non-empty `partner_id`, and carries a template that
  actually uses it. Until then the reader gets an ordinary outbound link.
- `components/outbound-link-group.tsx` — the only component that may render a
  paid link, and it renders the FTC disclosure from the same array. They cannot
  drift apart.
- `/go/<key>` — logs `partner → page → area → intent` plus placement,
  destination host, and whether the click actually paid, then redirects. Test
  traffic is excluded at write time by `scripts/test-traffic-lib.mjs`.
- `scripts/affiliate-report-lib.mjs` — per-partner performance for the KPI
  report or the weekly scorecard.

## What the owner must actually do

Each destination below is a real company CREN already links to. **None of these
programs has been applied to, and no claim is made here that a given company
currently runs one, that CREN would be accepted, or what it would pay.** The
first step for every line is the same: open that company's own site, find its
affiliate / partner / referral page, and confirm the program exists and accepts
publishers like CREN before spending time on it.

| Partner | Where readers meet it | Program to look for |
|---|---|---|
| Zillow | `/housing-search` buy, rent, list-a-rental | Zillow Group partner / advertising programs (Zillow Rental Manager and Premier Agent are advertising products, not publisher affiliate programs — verify what, if anything, is open to a publisher) |
| Realtor.com | `/housing-search` buy, rent, list-a-rental | Realtor.com / Move, Inc. partner or affiliate program, and Avail's landlord-tools referral program |
| Redfin | `/housing-search` buy | Redfin partner / referral program |
| Homes.com | `/housing-search` buy | Homes.com (CoStar Group) publisher or affiliate program |
| Apartments.com | `/housing-search` rent, list-a-rental | Apartments.com (CoStar Group) publisher or affiliate program |
| AffordableHousing.com | `/housing-search` rent | AffordableHousing.com partner program |

Two practical notes before any of this is worth time:

1. **Check the arithmetic first.** Per `.claude/skills/cren-revenue`, at the
   current measured audience the entire affiliate line is worth **under $3 a
   month**. It is revenue line #2 behind lead intake for a reason. Join a
   program when it is nearly free to do so; do not reorganise the site around
   it.
2. **Housing portals are the hardest category to monetize as a publisher.** If
   nothing here is open to CREN, the honest answer is that this line stays at
   $0 until the audience justifies a different partner set. Do not substitute a
   loosely-related program (a mover, a lender, an insurer) into a housing-search
   comparison grid just to have something paying there — that is the exact
   editorial-neutrality failure item 10 forbids.

## How to switch one on

No deploy required.

```sql
UPDATE affiliate_programs
   SET program_name          = '<the program as it names itself>',
       network               = '<network, or NULL if direct>',
       partner_id            = '<the real ID the program issued>',
       tracking_url_template = 'https://<their domain>/...?<their id param>={{PARTNER_ID}}&<their url param>={{DESTINATION}}',
       status                = 'active',
       joined_at             = NOW(),
       updated_at            = NOW()
 WHERE partner_slug = 'zillow';
```

`{{PARTNER_ID}}` is required. `{{DESTINATION}}` is optional and is substituted
with the URL-encoded plain destination for deep-linking programs. On the next
render that partner's links become tracked affiliate links, gain a visible
"Affiliate link" label, and the FTC disclosure appears above the block
automatically. Nothing else on the page moves: the comparison set and its order
are fixed in code and are not readable from the money.

Set `status = 'pending'` while an application is under review. Pending never
produces a paid link.

## Rules that do not bend

- Never paste a tracking ID you were not actually issued.
- Never add an affiliate block to an article body. Utility and resource pages
  only.
- Never drop, demote, or reorder a comparison option because another company
  pays. `tests/outbound-partners.test.ts` pins each intent's list and asserts
  that attaching money to one partner changes nothing about the others.
- Never quote a commission rate or a click number that did not come out of
  `npm run newsroom:affiliate-report`.

## Reporting

```
DATABASE_URL=... npm run newsroom:affiliate-report -- --window 30
```

Prints real (test-excluded) outbound clicks by partner, page, area, intent, and
placement, alongside the program status table — so the difference between
"traffic we sent away" and "traffic that paid" is always visible.
