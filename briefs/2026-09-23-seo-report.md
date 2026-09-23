# CRE News — Weekly SEO & Coverage Report
**Period:** September 16–22, 2026
**Generated:** 2026-09-23
**Routine:** cre-news-weekly-seo v2 (live-corpus)

---

## Data provenance

**Live corpus:** Per `frontend/content/snapshot/public-data.json` refreshed September 21 (the newest committed snapshot available to this routine), 104 articles carried `status = 'live'` at that point. September-to-date live count beyond that snapshot is UNMEASURED from this environment — the routine does not have DB or analytics access and cannot query the live publication total. Operator-verified last audited publication: **2026-09-22T15:13:38.784353Z** (read-only production DB, verified 2026-09-23T08:25Z).

**Committed draft packages:** 10 JSON articles are committed to the repository under `frontend/content/articles/` for dates September 13–22. Current handoff architecture is public GitHub `main` → hosted Vercel import/image/proof pipeline; the cloud routine commits JSON and source-image packages only and does not write to the Neon DB directly. A committed JSON is not a publication; import, image prep, and proof delivery are Vercel's responsibility.

**No Google Trends, Search Console, ranking, traffic, or conversion data is available during this run.** All search-interest characterizations are hypotheses inferred from search result density and source volume, not measured demand.

---

## 1. Coverage audit — September 16–22, 2026

### Live publications this week

**Live count for Sep 16–22: UNMEASURED** — no analytics, Search Console, or DB access is available to this routine. Per operator-verified production read at 2026-09-23T08:25Z, the last audited publication timestamp is **2026-09-22T15:13:38.784353Z**. The Sep 21 snapshot (104 articles, most recent Sep 12) reflects the state before that publication and is stale for counting purposes. Total Sep 16–22 live publications cannot be confirmed from committed files alone.

### Staged packages (committed to GitHub, not live)

All 7 articles drafted September 16–22 are committed to the repository. Their current Vercel import/proof status is UNMEASURED from this environment except as noted in Section 4. Per operator verification at 2026-09-23T08:25Z, one draft in the Vercel queue is blocked `REAL_PHOTO_RESEARCH_REQUIRED`.

| Date drafted | Slug | Area | Asset class | Content-gate status | Action |
|---|---|---|---|---|---|
| Sep 16 | `2026-09-16-columbus-east-side-permanently-affordable-condos-community-land-trust` | East Side | Affordable / Homeownership | PASS | Vercel import/proof status: UNMEASURED |
| Sep 17 | `2026-09-17-italian-village-merus-428-apartments-state-library-site` | Italian Village | Multifamily | MULTIPLE FAILURES | Needs substantial rewrite; Vercel import/proof status: UNMEASURED |
| Sep 18 | `2026-09-18-columbus-olde-towne-east-mercy-on-main-affordable-housing` | Near East Side | Affordable | DO NOT PUBLISH | Duplicate of Aug 2 live article; also has malformed JSON |
| Sep 19 | `2026-09-19-columbus-zone-in-phase-2-public-comment-2026` | Citywide | Zoning / Policy | DO NOT PUBLISH | Substantial duplicate of Aug 23 live article |
| Sep 20 | `2026-09-20-columbus-mt-vernon-avenue-7m-rebuild-king-lincoln-bronzeville` | Near East Side | Neighborhoods / Infrastructure | A9 fix needed | Needs dated status claim correction; Vercel import/proof status: UNMEASURED |
| Sep 21 | `2026-09-21-columbus-motherful-co-housing-noe-bixby-far-east-side` | Far East Columbus | Affordable / Co-housing | A9 fix needed | Needs dated-claim fix; Vercel import/proof status: UNMEASURED |
| Sep 22 | `2026-09-22-dublin-metro-center-mixed-use-rezoning-columbus-ohio` | Dublin | Mixed-use / Zoning | 18/18 PASS | In Vercel queue; one draft confirmed REAL_PHOTO_RESEARCH_REQUIRED (operator-verified 2026-09-23T08:25Z) |

**Unique publishable articles this week (after removing DO NOT PUBLISH items):** 5

### Full backlog as of September 22

Including articles carried forward from the prior week (per Sep 22 brief), 10 articles are committed to the repository for dates Sep 13–22. Their individual Vercel import and proof-queue status is UNMEASURED from this environment. Per operator verification at 2026-09-23T08:25Z, one draft is confirmed blocked `REAL_PHOTO_RESEARCH_REQUIRED`; no pending or stuck proof, correction, or publication jobs were found.

| Priority | Slug | Status |
|---|---|---|
| 1 | `2026-09-13-columbus-northland-affordable-senior-housing-green-oaks-2026` | Needs content-gate verification |
| 2 | `2026-09-14-osu-moves-moritz-college-of-law-downtown-into-huntington-tower` | Content-gate PASS; oldest fresh story (9 days) |
| 3 | `2026-09-16-columbus-east-side-permanently-affordable-condos-community-land-trust` | Content-gate PASS |
| 4 | `2026-09-20-columbus-mt-vernon-avenue-7m-rebuild-king-lincoln-bronzeville` | Needs A9 dated-claim fix |
| 5 | `2026-09-21-columbus-motherful-co-housing-noe-bixby-far-east-side` | Needs A9 dated-claim fix |
| 6 | `2026-09-15-columbus-downtown-commission-diocese-gay-street-demolition` | STALE ADVANCE — rewrite as result story after Sep 22 hearing |
| 7 | `2026-09-22-dublin-metro-center-mixed-use-rezoning-columbus-ohio` | 18/18 PASS; in Vercel queue; one draft confirmed REAL_PHOTO_RESEARCH_REQUIRED |
| 8 | `2026-09-17-italian-village-merus-428-apartments-state-library-site` | Needs substantial rewrite |
| DO NOT PUBLISH | `2026-09-18-columbus-olde-towne-east-mercy-on-main-affordable-housing` | Duplicate + malformed JSON |
| DO NOT PUBLISH | `2026-09-19-columbus-zone-in-phase-2-public-comment-2026` | Duplicate of Aug 23 live article |

---

## 2. Coverage by area, topic, and asset class

### Neighborhood / area coverage (September 16–22 drafts, excluding DO NOT PUBLISH)

| Neighborhood | Articles this week |
|---|---|
| Near East Side (King-Lincoln Bronzeville) | 1 |
| East Side (Broad & Gould) | 1 |
| Italian Village | 1 |
| Far East Columbus / Southeast | 1 |
| Dublin | 1 |
| Citywide (zoning) | 0 (held — duplicate) |

**Running gap list — zero coverage in September 2026 to date:**
- Short North (highest Columbus search-volume neighborhood; zero stories this month)
- German Village (metro's highest median sale price ~$737K; zero stories)
- Franklinton (three simultaneous active West Broad projects; last covered Aug 2026)
- New Albany / Columbus data center corridor
- Clintonville
- Upper Arlington (school bond vote Nov 3 — 6 weeks away)
- Worthington, Hilliard, Grove City, Gahanna, Polaris/Westerville (outer suburbs: zero)

### Asset class coverage (September 16–22 drafts, excluding DO NOT PUBLISH)

| Asset class | Count | Notes |
|---|---|---|
| Affordable housing / Homeownership | 2 | Sep 16 (CLT condos), Sep 21 (co-housing) |
| Multifamily | 1 | Sep 17 (Italian Village Merus — needs rewrite) |
| Neighborhoods / Infrastructure | 1 | Sep 20 (Mt. Vernon Ave rebuild) |
| Mixed-use / Zoning | 1 | Sep 22 (Dublin Metro Center) |

**Asset classes with zero September coverage:**
- Industrial / Data center (largest current capital deployment in Central Ohio — no story)
- Office market (four consecutive quarters of positive absorption — no market overview)
- Single-family residential (Columbus REALTORS September data not yet covered)
- Retail / Commercial (no lifestyle story published in 11+ days)
- Senior housing (only one story all of August)
- Build-to-rent
- Investment sales / Cap rates

### Source diversity

All five unique publishable drafts this week relied on Columbus Underground as a primary or confirming secondary source (2 of 5 as primary). Three relied on it exclusively for the initial discovery. Colliers Columbus weekly, Columbus Business First, ABC6, NBC4, and City of Dublin planning pages each appeared in one draft. No Columbus REALTORS primary data was used this week. No OHFA, Franklin County Auditor, or government planning-record primary was fetched this week.

**Diversity gap:** Columbus Underground is doing heavy lifting across both discovery and verification. A deliberate effort to source from Columbus Business First (for development/commercial), WOSU (policy/civic), Franklin County data portals (property records), and Colliers/JLL quarterly reports (market data) would strengthen independence.

---

## 3. Duplicate and stale-angle tracking

| Held item | Reason | Action |
|---|---|---|
| Sep 18 Mercy on Main | Duplicates Aug 2, 2026 live article + malformed JSON | Do not publish |
| Sep 19 Zone In Phase 2 | Substantial duplicate of Aug 23 live article; same primary sources | Do not publish |
| Sep 15 Diocese advance | Advance window expired; hearing was Sep 22 | Rewrite as result story (hearing outcome needed) |

**Recurring keyword over-use:** `near-east-side` appears in 3 of 5 unique publishable drafts this week (60%). Combined with the prior week's analysis, it remains the dominant area tag. Franklinton, Short North, and New Albany are all search-rich and underserved.

---

## 4. Production pipeline status

### Architecture note

The current handoff is: **cloud routine commits JSON + source-image packages to public GitHub `main`** → **hosted Vercel pipeline handles import (minute 05), image prep (minute 10), and proof delivery (minute 15) hourly**. The routine does not call `publish-article.mjs`, `newsroom-run.mjs`, or database scripts, and `DATABASE_URL` is intentionally not injected into the routine's environment (`routines.md`, synchronized Sep 22, 2026). References to DATABASE_URL absence, Higgsfield calls, BLOB_READ_WRITE_TOKEN, and `articles_live_image_required` constraint failures in Sep 16–22 daily briefs describe prior-architecture sessions that operated before the Sep 22 policy update. They are **not current operational blockers**.

### Operator-verified production state — 2026-09-23T08:25Z (read-only DB)

| Metric | Value |
|---|---|
| Last audited publication | 2026-09-22T15:13:38.784353Z |
| Draft(s) in Vercel queue — current hold | One draft blocked `REAL_PHOTO_RESEARCH_REQUIRED` |
| Vercel import last attempt | 2026-09-23T08:05:18.565698Z — status `NO_ARTIFACTS` (expected: no new article JSON committed in that cycle) |
| Pending/stuck proof jobs | None |
| Pending/stuck correction jobs | None |
| Pending/stuck publication jobs | None |
| Vercel config: import | `true` |
| Vercel config: paid AI images | `false` |
| Vercel config: proof workflow | `true` |

### Current editorial hold

`REAL_PHOTO_RESEARCH_REQUIRED` is the one confirmed Vercel-queue hold as of the operator read. This means the draft in question has not had a rights-cleared photograph committed with it per `CLOUD_ROUTINE_HANDOFF.md`. The correct resolution is to complete photo research, download the original bytes, verify rights explicitly allow public redistribution, perform a visual review, and commit the image file with the required provenance receipt before the Vercel proof workflow can proceed.

### Note on historic `editorial_email_reviews` rows

The Sep 22 audit session (which operated under the old direct-DB architecture) noted that 104 of 105 live articles lacked an `editorial_email_reviews` row. This does not establish unauthorized publication: the email-review gate was introduced by the Sep 22 owner policy update; articles published before that date predate the gate requirement. This is not a current operational blocker and does not require investigation before resumed publication.

---

## 5. Social listener highlights (unverified leads — all require independent source confirmation before assignment)

Sources: `briefs/2026-09-20-social-listener.md`, `briefs/2026-09-21-social-listener.md`, `briefs/2026-09-22.md`.

| Theme | Volume | Frame | Lead quality |
|---|---|---|---|
| Diocese 197 E. Gay St. — Downtown Commission vote result (Sep 22) | HIGH | Immediate result story peg | HIGH — hearing confirmed; decision should be on public record now |
| Columbus rental registry — $15/unit annual fee, litigation threat from Columbus Apartment Association | HIGH | Explainer + accountability | HIGH — Columbus City Council records, NBC4, BREAD statements all indexed |
| Zone In Phase 2 — 60-day comment closes Oct 24; area-commission-by-commission breakdown | HIGH | Civic explainer (time-sensitive) | MEDIUM — sources confirmed but CREN has duplicate-risk backlog article (hold that; write fresh area-by-area piece) |
| Franklinton: Peninsula Phase II Giant Eagle grocery anchor + 550/555 W. Broad activity | STEADY | Development / lifestyle | HIGH — 3 sources confirmed (10tv, Columbus Underground ×2) |
| Stone Ridge at High Street 150-unit affordable groundbreaking (Aug 25; NRP Group) | STEADY | Affordable housing | MEDIUM — 3+ sources confirmed; 28 days old as of Sep 23; still publishable |
| Columbus data center build-out (New Albany/Licking County) | STEADY | Industrial / land use | HIGH — WOSU, Cologix, ABC6 sources confirmed in prior SEO report |
| Our City Our Say Issue 8 — Nov 2026 ballot, housing development implications | LOUD | Policy / governance | MEDIUM — housing angle is under-covered; election timing makes it time-sensitive |
| AI tenant screening / eviction records + $2.8M city eviction aid | LIGHT-STEADY | Consumer / policy | LOW-MEDIUM — verify 90% screening stat from Second Chance Housing / Settl before assigning |

---

## 6. Five evidence-led assignments for the week of September 23–29, 2026

### Assignment 1 — Diocese Gay Street demolition result story
**Working title:** "Downtown Commission Denies / Approves Diocese Demolition at 197 E. Gay Street"
**Primary keyword hypothesis:** `diocese columbus gay street demolition` · `downtown commission columbus`
**Area / Asset class:** Downtown Columbus · Historic preservation
**Why now:** The Downtown Commission hearing was September 22. The commission's decision is the live story peg. CREN has a stranded advance draft (Sep 15) with sourced background; the result story is a natural next step. Community sentiment indexed in two Columbus Underground opinion pieces is strongly opposed to demolition — the contrast between a nearby 71-unit affordable housing project (Finance Fund) and a same-block demolition for surface parking is the emotional center of the story.
**Exact sources to check:** Downtown Commission meeting minutes or BZAP records at development.columbus.gov (primary), Columbus Underground original news piece "Church Wants to Tear Down 5-Story Downtown Building" (secondary), Columbus Underground opinion pieces "Goodbye, Gay Street" and "The Catholic Church Can Afford to Fix Their Downtown Building" (context), NBC4 / ABC6 day-of coverage if filed.
**Evidence threshold:** Commission decision on record at primary source before drafting.

---

### Assignment 2 — Columbus rental registry explainer
**Working title:** "Columbus's New Rental Registry: What Landlords Owe, What Tenants Gain, and Who Is Fighting It"
**Primary keyword hypothesis:** `columbus ohio rental registry` · `columbus rental property registration`
**Area / Asset class:** Columbus metro · Multifamily (landlord / tenant policy)
**Why now:** Columbus City Council passed the residential rental registry ordinance in April 2026. The Columbus Apartment Association has retained outside counsel and signaled litigation citing state law preemption. No plain-language explainer exists in Columbus local real estate media. The litigation threat is the live hook; the $15/unit registration fee and triennial inspection requirement are the practical content. This is a story that answers a real reader question with broad operator audience reach.
**Exact sources:** Columbus City Council ordinance text or Columbus City Code (primary), Columbus Apartment Association legal statement (NBC4, secondary), BREAD / tenant-advocacy coalition statements (Columbus Today / Legal Aid, secondary), Columbus Building and Zoning Services implementation timeline (primary if available).
**Evidence threshold:** Primary ordinance text confirmed at columbus.gov or council records before drafting.

---

### Assignment 3 — Peninsula Phase II: Giant Eagle Anchors Franklinton's Most Ambitious Mixed-Use Yet
**Working title:** "Giant Eagle Is Coming to Franklinton — Here's What Peninsula Phase II Means for Residents and Investors"
**Primary keyword hypothesis:** `franklinton columbus apartments` · `peninsula franklinton columbus`
**Area / Asset class:** Franklinton · Multifamily / Retail / Mixed-use
**Why now:** Peninsula Phase II (250 apartments + parking + Giant Eagle ground-floor grocery at Broad & Belle) fills a documented food-access gap in a neighborhood historically classified as food insecure. Construction expected 2026, completion 2027–28. Three independent sources confirm (10tv for Giant Eagle anchor; Columbus Underground for 550 W. Broad Grateful Development approval; Columbus Underground for 555 W. Broad / NRI Byers Chevrolet demolition). The story has dual audiences: residents (food access, walkability) and investors (commercial density catalyst, "next Short North" appreciation dynamic). CREN has not covered any Franklinton story since August.
**Exact sources:** 10tv article on Peninsula Phase II Giant Eagle (https://www.10tv.com/article/news/local/boomtown-ohio/the-peninsula-phase-2-giant-eagle-downtown-columbus/530-c2b7fff7-fdcc-481f-bc24-cb0d8b9319d3, secondary), Columbus Underground articles on 550 and 555 W. Broad (secondary), Franklinton Development Association / city planning documents for Giant Eagle ground-floor retail confirmation (primary if available), Crawford Hoying as developer (secondary confirmation from 10tv).
**Evidence threshold:** Giant Eagle tenancy confirmed at primary or developer source before claiming it as fact.

---

### Assignment 4 — Stone Ridge at High Street: 150-Unit South Side Affordable Housing Groundbreaking
**Working title:** "NRP Group Breaks Ground on 150-Unit Affordable Complex in South Columbus"
**Primary keyword hypothesis:** `south columbus affordable housing` · `nrp group columbus ohio`
**Area / Asset class:** South Columbus (45 W. Barthman Ave.) · Affordable housing / Multifamily
**Why now:** NRP Group broke ground on August 25 — the story is 28 days old but still publishable; it has not been covered by CREN. Three or more independent sources confirm: NRP Group press release via Yahoo Finance, NBC4 WCMH-TV, Multi-Housing News, Multifamily Biz. Financing: Deutsche Bank (construction + permanent); co-sponsors: City of Columbus and OHFA. 60% AMI, one- through four-bedroom units, completion April 2028. At 4.5 acres and 150 units, it is the largest South Side affordable project reported in CREN's recent research. It also provides a concrete data point for the $500M housing bond's output — connecting to the stranded Sep 16 Broad & Gould CLT condos story.
**Exact sources:** NRP Group press release via Yahoo Finance (https://sg.finance.yahoo.com/news/nrp-group-breaks-ground-150-154700390.html, primary), NBC4 (https://www.nbc4i.com/news/local-news/columbus/construction-begins-on-150-unit-affordable-housing-development-in-south-columbus/, secondary), Multi-Housing News (secondary).
**Evidence threshold:** Two independent sources minimum; confirm address, unit count, and AMI cap at primary.

---

### Assignment 5 — Columbus Data Center Build-Out: What New Albany's Land Rush Means for Central Ohio Real Estate
**Working title:** "Columbus Is Becoming the Great Lakes' #2 Data Center Hub — What That Means for Central Ohio Land"
**Primary keyword hypothesis:** `columbus data center new albany ohio` · `new albany ohio real estate`
**Area / Asset class:** New Albany / Licking County corridor · Industrial / Data center
**Why now:** This gap was the top-ranked assignment in the September 20 SEO report and remains unfilled. Columbus is tracking to become the #2 Great Lakes data center hub (WOSU, January 2026). Meta Prometheus (New Albany, 1GW), Cologix $1B campus groundbreaking (Columbus Construction Trades), EdgeConneX 524K sq ft conversion, and Vantage OH1 are all active. No Columbus local real estate outlet has connected the data center build-out to land acquisition, industrial zoning pressure, and investor-facing land-value implications in the New Albany International Business Park corridor. This is CREN's clearest unoccupied SEO opportunity in an asset class generating the largest single capital deployment in Central Ohio right now.
**Exact sources:** WOSU "Columbus will become second-largest data center hub" (January 2026, secondary), Cologix groundbreaking coverage via Columbus Construction Trades (secondary), DataCenter Dynamics Vantage OH1 Columbus coverage (secondary), ABC6 Ohio data center surge reporting (secondary), City of Columbus / Licking County planning records for zoning changes near New Albany International Business Park (primary, needs direct fetch).
**Evidence threshold:** Two independent named projects with confirmed addresses or parcel records before drafting land-use implications.

---

## 7. Production cadence summary

**Last audited publication:** 2026-09-22T15:13:38.784353Z (operator-verified, read-only DB, 2026-09-23T08:25Z).

**Vercel import last ran:** 2026-09-23T08:05:18.565698Z — status `NO_ARTIFACTS` (expected when no new article JSON was committed in that cycle).

**Sep 16–22 live count:** UNMEASURED — no DB or analytics access available to this routine. The Sep 21 snapshot (104 articles, last entry Sep 12) predates the Sep 22 publication and understates the live total.

**Editorial output (Sep 16–22):** 5 unique publishable draft packages committed to `main` (2 held as DO NOT PUBLISH — duplicates). Drafting capacity is producing well-sourced work; photo research remains the gating requirement under current policy before any article can enter the Vercel proof workflow.

**Prior SEO report benchmarks (Sep 20 report) still unresolved:**
- Short North: still zero coverage
- German Village: still zero coverage
- New Albany / data center: still zero coverage
- Franklinton: still zero coverage
- Office market overview: still zero coverage
- Single-family market data piece: still zero coverage

**Owner action items:**

| Priority | Action | Why |
|---|---|---|
| P1 | Complete rights-cleared photo research for each backlog article before committing | `REAL_PHOTO_RESEARCH_REQUIRED` is the one confirmed Vercel hold; per `CLOUD_ROUTINE_HANDOFF.md`, a rights-verified source image with provenance receipt must be committed with the package |
| P2 | Confirm Telegram alerting credentials are configured | `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` raised repeatedly; confirms operational alert channel is working |

---

*Report generated by the CRE News weekly SEO routine. Corrected 2026-09-23: production-state and architecture claims updated to reflect operator-verified read-only DB evidence at 2026-09-23T08:25Z and current GitHub→Vercel handoff architecture per `.claude/routines.md` and `frontend/prompts/CLOUD_ROUTINE_HANDOFF.md` (both synchronized 2026-09-22). Old-architecture blocker language (DATABASE_URL, Higgsfield, BLOB_READ_WRITE_TOKEN, articles_live_image_required) removed; zero-publication claim corrected; editorial_email_reviews characterization corrected.*
*Period: September 16–22, 2026. Generated: September 23, 2026.*
*Sources: daily newsroom briefs Sep 16–22 (briefs/2026-09-{16–22}.md), social-listener briefs Sep 20–21, prior SEO report (briefs/2026-09-20-seo-report.md), monthly operating review (briefs/2026-09-22-monthly-operating-review.md), public-data snapshot (frontend/content/snapshot/public-data.json), committed article JSON files under frontend/content/articles/, operator-verified production DB read 2026-09-23T08:25Z.*
