# CREN Monthly Operating Review — September 2026

Prepared: 2026-10-01 | Routine: cre-news-monthly-review v1 (planning-only)
Review period: 2026-09-01 through 2026-09-30 (America/New_York), the previous complete calendar month.

This is a planning input only. It performs no outreach, publication, spend, or credential change. Every figure comes from
files committed to this repository (daily briefs, weekly SEO reports, social-listener briefs, newsroom run receipts,
CMO directives, article JSON, CRM files). The live site, database, Search Console, and analytics were **not** queried;
anything that needs them is marked **UNMEASURED**. The Drive copy of this report is saved separately (see delivery note at the end).

## Data limits (read first)

- **No live traffic or conversion data for September exists in the committed record**, apart from the 7-day KPI snapshots quoted in CMO directives (Sep 28 and Sep 29). The Oct 1 directive could not produce a snapshot: the database rejected its credential ("password authentication failed for user 'neondb_owner'"), on the run and on one retry.
- The September 1–22 briefs say the **publication path was DB-based** (`publish-article.mjs`, `DATABASE_URL`). From roughly Sep 22–27 the record shows a switch to the hosted handoff model (commit JSON + image package; Vercel imports and publishes). The 2026-09-27 brief states a stale scheduled prompt had directed database use that violates the CLAUDE.md safety boundary. Pre- and post-switch records therefore measure different things.
- "Published/live" counts for Sep 1–22 come from the routine's own briefs and SEO reports, not from the site. The only operator-verified live figure is **105 live articles as of 2026-09-22T15:13Z** (per the 2026-09-23 SEO report). The current live count is unknown.

## 1. Editorial output and topic/area balance

| Period | What the record shows | Status basis |
|---|---|---|
| Sep 1–12 | One article drafted per day nearly every day (Continental Tower, Nationwide Children's East Main, Diocese Gay St., German Village Cedar Square, Franklin County triennial review, Trader Joe's Polaris / Stone Ridge, Second Baptist RFP, Brownfield $120M, Brewery District WWCD, Lower Olentangy Tunnel, INTRO mass timber, Reserve at Maryland modular) | Briefs and Sep 6/13 SEO reports mark most as live; some "status unconfirmed" |
| Sep 13–22 | 10 articles committed/staged; briefs call them **"stranded"** (day 23 of missing DATABASE_URL on Sep 22). Sep 18 (Mercy on Main) was a **duplicate** of an Aug 2 live piece and was correctly marked do-not-publish | Sep 23 SEO report: operator confirmed 105 live as of Sep 22; Sep 22 Dublin Metro Center draft held at import on `REAL_PHOTO_RESEARCH_REQUIRED` |
| Sep 23–26 | **Four consecutive `NO_QUALIFYING_STORY` days**; sole binding blocker was `NEEDS_IMAGE` | Run receipts 2026-09-23..26 |
| Sep 27–30 | **Four consecutive article packages** under the amended image policy: Demolition Watch (Sep 27, gate 18/18), Worthington Harding Hospital referendum (Sep 28), Permit Pulse (Sep 29), Q3 housing permits (Sep 30, 1,599 units, about 11% below Q3 2025) | Receipts `ARTIFACTS_COMMITTED`; downstream import/publication **not confirmed** |

Committed article JSON in the repo: 17 files dated Sep 11–Oct 1 (13 within September 11–30 of which 12 are Sep 11–22; Oct 1, One Twenty Vine, falls in October and is outside this review).
Balance, from the Sep 6/13/20/27 SEO reports:
- Heavy in **multifamily/affordable housing and Near East Side** (4 of 6 unique drafts in the week of Sep 14–20 carried `near-east-side`) — the SEO report flags this as dominant at the expense of balance.
- **Never or barely covered in September:** Short North, Franklinton (active pipeline, last covered in August), Clintonville, New Albany / data centers (flagged as the largest capital deployment in Central Ohio), the office-market overview, the industrial/data-center asset class, single-family (Columbus REALTORS August report), retail/restaurant lifestyle, and most of the suburban ring (Upper Arlington school bond vote Nov 3 is on the calendar with no story).
- **Lifestyle:** the Sep 1, 5, 9 briefs each record "lifestyle slot quiet." The record shows no lifestyle-category story in September, so the two-slot (one real estate, one lifestyle) design produced real estate only.
- New in late September: the **recurring data formats** (Demolition Watch, Permit Pulse, quarterly permits) are filling slow-news days. This is a structural improvement, though all four use the same permits dataset and a Columbus-citywide angle.

## 2. Source and image-policy compliance

**Sourcing — strong where documented.** Duplicate drafts were caught before publish (Mercy on Main Sep 18; Zone In Phase 2 and others held for duplicate risk in the Sep 23 SEO correction). The Sep 23 SEO report states two packages needed correction for dated-claim failures (Mt. Vernon Ave, Motherful) and that one had malformed JSON. The Oct 1 directive records **One Twenty Vine shipped on a single readable origin** (Yahoo syndication of NBC4i), because nbc4i.com, columbusunderground.com, bizjournals.com, 10tv.com, dispatch.com, multihousingnews.com, and axios.com returned HTTP 403 to the routine. Under the "syndicated copies count as one source" rule that story is below the two-independent-origin bar the Worthington story met; the owner should check how it was handled at the gate. Primary City of Columbus PDFs (City Bulletin #39, Legistar ordinance 2452-2026) were unreadable, and the McCoy Park NWSL rezoning vote stayed unconfirmable for three runs.

**Image policy — a clear violation in the committed corpus, then a policy fix.**
- All 12 September packages dated Sep 11–22 (the ones I could parse; the Sep 20–22 files were also flagged in the SEO report) declare `image_provenance.type = AI_GENERATED` and `prompt_version cren-article-v1.0.0`. The current contract is `cren-article-v1.0.2`, and `IMAGE_POLICY.md` / `CLOUD_ROUTINE_HANDOFF.md` prohibit AI-generated imagery. Three also carried non-ISO `date` fields ("Sep 21, 2026"). These packages cannot be treated as compliant.
- The **Sep 26 policy amendment** (CREN chart/map/data-card fallback, plus recurring data formats) removed the `NEEDS_IMAGE` stall. The Sep 27–30 packages use `CREN_GRAPHIC` hero images (bar charts, role DATA) built from CC0 city data. These are consistent with policy; I did not independently re-run the visual review.
- **No story-specific, rights-cleared news photograph appears in any September package.** The Sep 25 receipt explains why: redistributable Commons photos exist for existing landmarks (North Market, Scioto Peninsula) but not for new or proposed projects. The CREN-owned photo intake path (`frontend/docs/PHOTO_INTAKE.md`) is the only structural fix and the Oct 1 directive says no intake instruction was sent.

## 3. Workflow reliability and held work

- **Missing DATABASE_URL, Sep 1 through about Sep 22 (4 of the September briefs I counted explicitly say "absent"; the Sep 22 brief says day 23).** The old workflow could not run the duplicate guard, publish, or coverage tools for three weeks. Authors worked around it by reading brief history. Backlog reached **10 stranded articles** on Sep 22. This is a legacy-architecture failure and is superseded by the hosted-handoff model, but the record does not show how the 10 stranded drafts were resolved; only that 105 were live on Sep 22. **Resolution of the stranded backlog is not documented.**
- **Policy conflict flagged Sep 27:** a scheduled prompt still told the routine to use DATABASE_URL and `publish-article.mjs`. The routine correctly refused and followed `CLAUDE.md`. Confirm no stale prompt remains.
- **Site HTTP 403 from the cloud container (from Sep 5):** briefs attribute it to a container IP block, not an outage; it was confirmed healthy from credentialed sessions. Treat as unmeasured for September.
- **Primary-outlet 403 blocks and PDF extraction.** The P2 research-tooling directive (Sep 22/29) did not ship. Measured cost: four days (Sep 23–26) of no story at the start of the drought, then the McCoy Park vote left unconfirmed.
- **KPI pipeline down as of Oct 1** (credential rejected). The owner credential may have been deliberately rotated after the Sep 27 flag; the CMO directive recommends a least-privilege, read-only reporting path, not a restored owner credential.
- **Import/publication of Sep 27–30 packages is unconfirmed** from the repository; the receipts correctly say a commit is not publication. Three consecutive SEO reports (Sep 13/20/27) mark live status as UNMEASURED or Pending for recent days.
- **Telegram alerts:** the briefs from August onward record them as not configured. I found no September evidence that this changed.

## 4. Audience and search performance (measured data only)

Only the CMO KPI snapshots in the committed directives contain September measurements, and the Oct 1 snapshot failed.

| Metric | Value | Source |
|---|---|---|
| 7-day window to Sep 29: subscribers (total) | 3, +0 in window | `directives/2026-09-29-cmo.md` (test traffic excluded by shared predicate) |
| Free members / contact messages / leads (all personas) | 0 / 1 / 1 (total), +0 in window | same |
| Articles published in window | 2 (Sep 28 directive: 2, "up from 1") | Sep 28 and 29 directives |
| Four revenue funnels: views / CTA clicks / starts / submissions | **0 / 0 / 0 / 0 on every funnel, for the 19th consecutive snapshot** | Sep 29 directive |
| Test traffic excluded | 36 rows (contacts 6, subscribers 8, leads 2, members 1, affiliate clicks 19) | same |
| Renter lead from Sep 5 | status `new`, Contacted 0, unanswered 24 days as of Sep 29 | same |
| Oct 1 snapshot (week to Oct 1) | **No data: database authentication failed** | `directives/2026-10-01-cmo.md` |

**UNMEASURED:** pageviews, unique visitors, search impressions/clicks/rankings, referrers, email-list size beyond the above, newsletter delivery, social reach, affiliate revenue. No Search Console or analytics figures for September are in the record, and the weekly SEO reports state so explicitly. I make no traffic claims.

Reading the 0 funnel views: both the CMO directive's own hypothesis and my reading point to a likely deploy/instrumentation gap (the conversion layer may be on `main` but not in production). A zero is not evidence of zero demand. Treat it as unverified until instrumentation is confirmed.

## 5. Media-revenue opportunities (sponsors/advertisers; kept separate from editorial and from Section 6)

- Nothing measured supports a pricing claim. With no verified September audience data, any rate card statement beyond the existing "sales accuracy rules" document would be invented.
- The `crm/` files are essentially empty (prospects 171 bytes, partners 146 bytes, outreach log 50 bytes). There is no prospect, outreach, or sponsor activity in the record for September.
- Realistic opportunity: the low-commitment "founding" listing from `sales/rate-card.md`, offered only after measurement is restored and with disclosure that audience is early-stage. Any approach to a developer that CREN covers (Nationwide Realty Investors, Arena District; Elford, Worthington) must run on a separate track from the newsroom, and those two should not be approached while their stories are live.
- A sponsor-safe recurring format already exists: the permits and demolition data series are neutral and could carry a "presented by" line later, without touching story selection.

## 6. CREN property-inquiry opportunities (separate from Section 5)

- Funnels: FSBO seller, investor seller, capital partner, renter. September record: **0 views and 0 submissions on every funnel** in each snapshot quoted; **1 real renter lead, unanswered 24+ days**. That lead is the single most actionable item in this review and falls outside this routine's authority: the owner or CRM workflow should contact the person.
- Content already supports intent segments that the funnels serve: the Q3 permits and Permit Pulse pieces (market data, renter and investor audiences), and the Franklin County triennial property-value review (Sep 5; home-seller audience). Whether they converted is UNMEASURED because the conversion layer's exposure is unverified.
- No dollar value, conversion rate, or pipeline figure is claimed.

## 7. Next-month experiments (planning inputs)

1. **Restore a read-only KPI path** before running any other experiment. Without it, none of the below can be judged (CMO P1).
2. **Measure real-photo supply:** commit one owner-photo intake request so at least one story per week can run with a CREN-owned photograph, and compare against chart-hero stories once traffic is visible.
3. **Fix the primary-source gap:** add PDF text extraction and decide which 403-blocked outlets can be replaced with primary public records or RSS, then count verified-story days vs. `NO_QUALIFYING_STORY` days.
4. **Test a lifestyle slot cadence:** September produced zero lifestyle stories. Assign one weekly lifestyle target and track the hit rate.
5. **Coverage-gap sprint:** Short North, Franklinton, New Albany/data centers, an office-market overview, Clintonville, and the Upper Arlington school bond (vote Nov 3, so time-sensitive).
6. **Rebalance the Near East Side concentration:** cap a single neighborhood at about two of seven weekly items.
7. **Verify the two-origin rule on syndicated copy** in the gate so single-origin stories are held or labelled.
8. **Resolve the stranded backlog:** list the 10 Sep 13–22 packages and decide publish, correct (v1.0.2, non-AI imagery, ISO date), or discard, using the supervised correction path.
9. **Once instrumentation works, run a one-week funnel-link test** on three articles (renter, seller, investor), where the owner has approved the CTA copy.

## 8. Owner decision list

1. **Decide the KPI credential:** provide a least-privilege, read-only reporting credential (not `neondb_owner`), or confirm the rotation was deliberate and say how weekly measurement should work.
2. **Answer or reassign the Sep 5 renter lead** (unanswered 26 days as of Oct 1 if status is unchanged).
3. **Confirm the conversion layer and affiliate attribution are deployed** to production. The Sep 29 directive saw 19 straight zero-exposure snapshots.
4. **Decide the fate of the 10 stranded Sep 13–22 packages** and of the 12 `AI_GENERATED`-image/v1.0.0 packages (publish, correct, or withdraw).
5. **Review One Twenty Vine** for the two-independent-origin rule (single syndicated origin reached the gate).
6. **Confirm no scheduled prompt still directs database or direct publication use** (flagged Sep 27).
7. **Approve or decline the photo-intake request** (CREN-owned photographs) and the PDF/403 research-tooling work.
8. **Configure Telegram alerts** or name another push channel; not configured per the record.
9. **Confirm current live count and the import status of the Sep 27–Oct 1 packages**, since the record cannot.
10. **Approve a lifestyle target** and the coverage-gap list in Section 7.
11. **Hold sponsor outreach** until measurement and the public media-kit numbers are verified; keep it separate from the newsroom.

---
Delivery note: this report is saved to `briefs/2026-10-01-monthly-operating-review.md`; the Drive copy at `CRE News / monthly-reviews / 2026-10-01.md` is recorded by the routine run, not by this file.
