# Owner operating plan — 2026-09-04 (authoritative; absorbs 2026-09-04-cmo.md)

Source: live owner review of the public site, 2026-09-04, from a combined
CMO/COO/CTO perspective. This file is the operative direction. The CMO routine's
2026-09-04 directive is absorbed into it (its P1 ≈ item 2, its P2 ≈ item 4; its
corrections record stands). Priorities, wording of "done when," and the 30-day
sequence below are the owner's.

## Verification annotations (CMO routine, run against production 2026-09-04)

The owner's observations check out, with exact root causes:

1. **Market-data inconsistency (item 1).** Three copies of the market stats
   exist and two are stale:
   - `market_snapshot` DB table (current): 6,193 listings **+9.8% YoY**,
     30-yr rate **6.66%** (Freddie Mac, Aug. 27) — what the homepage showed.
   - `frontend/content/snapshot/public-data.json` (the committed DB-outage
     fallback, last exported ~Aug 24): same 6,193 but **"+7% YoY"** (line
     2410) and **"6.65%"** (line 2433) — what `/market-data` showed. The
     fallback has not been re-exported since the Aug 28–30 market refreshes,
     so any surface (or ISR window) that serves it disagrees with the DB.
   - `hero_stats` DB table is a *separate, manually-maintained* copy for the
     homepage stat bar (it carries +2.3% YoY price change and no listings
     YoY at all).
   - The **5,223 / +8.2% / 6.43%** numbers Google still surfaces live in the
     legacy prototype files `columbusrealestatenews-v2.html` and
     `columbusrealestatenews-v3.html` at the repo root — indexed remnants,
     not the Next.js app. They need deletion/noindex/redirects as part of
     item 1.
   Net: the canonical-object directive is exactly right — today there are at
   least four places a market number can live and nothing reconciles them or
   stamps `updated_at`.

2. **Author taxonomy (item 7).** Six bylines in production: CREN Newsroom
   (76), CRE Newsroom (11), CRE News Newsroom (3), CRE News Staff (3), CREN
   Staff (1), CRE News Desk (1). 19 articles need a one-time UPDATE to `CREN
   Newsroom`, plus a byline check added to the deterministic gate in
   `publish-article.mjs` so a variant can never publish again.

3. **Funnel instrumentation baseline (item 2).** The routine's 09-04 audit
   found every conversion record ever captured (8 subscribers, 5 contacts,
   2 leads, 8 affiliate clicks) is our own CRM smoke testing; real all-time:
   1 subscriber (the owner), 0 leads. Whatever telemetry item 2 builds must
   exclude test traffic by construction, or the funnel dashboard starts life
   polluted.

4. **Contextual CTAs (item 4).** Confirmed in code: the only conversion
   surface on article pages is the generic `blog-cta` "Stay Informed" block
   in `frontend/app/blog/[slug]/page.tsx`, which also promises a Tuesday
   newsletter that has never been sent (no email delivery exists). Removing
   or making that promise true belongs inside item 4's definition of done.

5. **Traffic context for sequencing.** Google organic is the only real
   channel today: 24 views / 22 visitors last 7 days, 57 views last 30, all
   landing on articles; pageviews peaked at 50 on Aug 27 (Sugar opening day,
   story published two days early) and decay between events. The owner's
   sequence (data consistency → funnel analytics → lead SLA → contextual
   CTAs → membership simplification → flagship hubs) fits that reality: fix
   measurement and trust before spending the small real audience on
   conversion experiments.

## The plan (owner's priorities, condensed; full text in the owner's review)

### P0
1. **CTO — One canonical market-data system.** Every public metric carries
   `value + geography + period + source + updated_at`; homepage,
   `/market-data`, header strips, area pages, articles, emails, and
   structured data consume the same versioned object; automated test fails
   the build when two current surfaces disagree. Includes: re-export or
   auto-export the fallback snapshot after every market refresh; retire
   `hero_stats` as an independent copy; remove/redirect the legacy v2/v3
   HTML prototypes.
2. **CTO + COO — Instrument the four funnels end-to-end.**
   `funnel_view → CTA_click → form_start → form_submit → contacted →
   qualified → opportunity → closed/revenue`, separately for FSBO,
   investor-sale, capital, renter; preserve article URL, area, CTA
   placement, campaign source; exclude test traffic by construction. Done
   when a weekly report shows traffic, starts, submissions, qualification
   rate, response time, and value by funnel.
3. **COO — One lead-response operating queue.** Every inquiry gets owner,
   status, received time, first-response time, disposition; alerts before
   the promised one-business-day SLA breaches. No lead exists without an
   owner and an SLA timer.

### P1
4. **CMO + CTO — Contextual article→funnel CTAs.** One restrained CTA after
   the body, matched to article taxonomy (seller / renter / capital /
   area-follow / membership fallback). No popups. CTR and submissions
   measurable per placement. (Also: no live page promises an undelivered
   newsletter.)
5. **CMO — Progressive membership signup.** Step 1: email + area/topic;
   step 2 post-signup: optional personalization. Measure visit→signup and
   secondary-profile completion independently.
6. **CMO + COO — Plain-English commercial disclosure on funnels.** Who
   receives the lead, whether CREN or another entity may buy the property,
   how CREN is compensated.
7. **COO — One newsroom identity.** Standardize `CREN Newsroom`; migrate
   the 19 variant articles; make author, dates, category, and source
   package deterministic in the pipeline (gate-enforced).
8. **CMO — 5–10 flagship neighborhood hubs** on the German Village model;
   measure organic entrances, follows, and leads by area. No 70 thin hubs.

### P2
9. **CMO — Advertiser proof before more ad inventory** (real reach numbers
   only; never manufactured).
10. **CMO + CTO — Affiliate monetization on high-intent utility pages**,
    clearly labeled, tracked `outbound_click → partner → page → area →
    intent`, editorial neutrality preserved.
11. **COO — Weekly operating scorecard**: Audience → Membership → Leads →
    Commercial → Editorial quality; leads broken out by the four funnels;
    measure business outcome per publish, not volume.
12. **CTO — Automated site-quality gates at the product layer**: links,
    sources, stale stats, author taxonomy, disclosures, form submission,
    analytics events, schema, indexability, canonicals, images, performance.

## Operating focus
- CMO north-star numbers: qualified leads per 1,000 sessions; free-member
  conversion rate; revenue/value per 1,000 sessions.
- COO: one identity, one workflow, one queue, one SLA, one scorecard.
- CTO: no major new features until the measurement/data layer is
  trustworthy.
- First 30 days: data consistency → funnel analytics → lead SLA →
  contextual CTAs → membership simplification → five flagship hubs.
  Postponed: visual redesign, paid membership, additional ad units.

## Status
- [x] Owner-directed (live review, 2026-09-04). Supersedes prior CMO
  directives; weekly CMO reviews now judge progress against this plan and
  its three north-star numbers.
