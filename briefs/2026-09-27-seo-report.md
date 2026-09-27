# CRE News — Weekly SEO & Coverage Report

**Period:** September 20–26, 2026
**Report date:** September 27, 2026
**Prepared by:** cre-news-weekly-seo v2 (scheduled cloud routine)
**Scope:** Repository corpus, daily newsroom receipts, and social-listener briefs. Not an analytics or ranking audit.

---

## Evidence and limitations

- **Repository article corpus:** 13 committed JSON files under `frontend/content/articles/`. These are not the full live corpus.
- **Operator-verified live count:** 105 articles as of 2026-09-22T15:13:38.784353Z (per `briefs/2026-09-23-seo-report.md`). Current live count: **UNKNOWN** — the live site was not queried this run; no newer operator-supplied figure is available.
- **Publications within September 20–26:** **UNMEASURED** — this report cannot confirm which, if any, committed packages were imported and published within the window. Newsroom run receipts report Vercel import as PENDING or NOT APPLICABLE for each day.
- **Search Console, Google Trends, rankings, traffic, conversions, social volume, and sentiment:** **UNMEASURED** — none of these sources was accessible this run. Search-result snippets and prior briefs are not substitutes.
- **Source-ledger counts below** describe committed metadata, not independent confirmation that sources were fetched or support each article.
- **Snapshot basis:** repository state on branch `claude/nice-cerf-5arwnd` as of 2026-09-27; prior SEO report at `briefs/2026-09-23-seo-report.md`; newsroom receipts at `frontend/content/newsroom-runs/2026-09-2[3-7].json`; social-listener briefs at `briefs/2026-09-[23-26]-social-listener.md`.

---

## 1. Draft and publication inventory for September 20–26

### 1a. Articles committed during the window

Three article JSON files were committed during September 20–22. Four consecutive days (September 23–26) produced `NO_QUALIFYING_STORY`. One recurring-format article was committed September 27 (outside the window; noted separately).

| Date committed | Slug / subject | Area | Category | Gate status |
|---|---|---|---|---|
| 2026-09-20 | `…mt-vernon-avenue-7m-rebuild-king-lincoln-bronzeville` | Near East Side / King-Lincoln Bronzeville | Neighborhoods / Infrastructure | Committed candidate — see image and schema issues below |
| 2026-09-21 | `…motherful-co-housing-noe-bixby-far-east-side` | Far East Side / Southeast Columbus | Development / Affordable housing | Committed candidate — see image and schema issues below |
| 2026-09-22 | `…dublin-metro-center-mixed-use-rezoning-columbus-ohio` | Dublin, Ohio | Development / Office market | Committed — **held at import on `REAL_PHOTO_RESEARCH_REQUIRED`** per `briefs/2026-09-23-seo-report.md` |

### 1b. Gate and contract issues on the three committed packages

All three packages carry known compliance problems that must be resolved before any is treated as publication-ready.

| Issue | Sep 20 Mt. Vernon | Sep 21 Motherful | Sep 22 Dublin Metro Center |
|---|---|---|---|
| `prompt_version` | `cren-article-v1.0.0` (outdated; current is `cren-article-v1.0.2`) | `cren-article-v1.0.0` | `cren-article-v1.0.0` |
| `image_provenance.type` | `AI_GENERATED` — violates `IMAGE_POLICY.md` and `CLOUD_ROUTINE_HANDOFF.md` (paid/AI generation prohibited) | `AI_GENERATED` | `AI_GENERATED` |
| `date` field format | `"2026-09-20"` (normalized) | `"Sep 21, 2026"` (not ISO `"2026-09-21"`) | `"Sep 22, 2026"` (not ISO) |
| Import / publication status | UNMEASURED (Vercel import not verified from this environment) | UNMEASURED | `REAL_PHOTO_RESEARCH_REQUIRED` — held at import; requires supervised editor correction path |
| Specific prior flag | `briefs/2026-09-23-seo-report.md`: "dated-status claim failure; requires correction and current validation" | `briefs/2026-09-23-seo-report.md`: "dated-claim failure; requires correction and current validation" | `briefs/2026-09-23-seo-report.md`: "one imported Dublin draft blocked REAL_PHOTO_RESEARCH_REQUIRED" |

**Correction guidance (from `CLOUD_ROUTINE_HANDOFF.md`):** For the already-imported Dublin draft, do not overwrite the GitHub JSON expecting automatic repair. Use the supervised draft-image attachment and correction workflow, revalidate the unchanged evidence and new image, and obtain a new proof before any approval. A changed candidate requires a new proof and a new standalone approval reply.

### 1c. No-qualifying-story days: September 23–26

| Day | Receipt | Primary blocker | Secondary blocker |
|---|---|---|---|
| 2026-09-23 | `frontend/content/newsroom-runs/2026-09-23.json` | `NEEDS_IMAGE` (no redistributable photo for any lead) | `COLUMBUSUNDERGROUND_UNAVAILABLE` (HTTP 403); Downtown Commission Sep 22 minutes not yet posted |
| 2026-09-24 | `frontend/content/newsroom-runs/2026-09-24.json` | `NEEDS_IMAGE` (binding; top Worthington lead fully verified otherwise) | NBC4 HTTP 403 |
| 2026-09-25 | `frontend/content/newsroom-runs/2026-09-25.json` | `NEEDS_IMAGE` (binding; redistributable Commons photos exist only for landmarks without current hooks) | Primary City Bulletin PDF not text-extractable; CU/NBC4/CBF blocked |
| 2026-09-26 | `frontend/content/newsroom-runs/2026-09-26.json` | `NEEDS_IMAGE` (binding; new WWCD/Brewery District lead is newsworthy but not photographed under a redistributable license) | NBC4/CU HTTP 403; HRC September primary minutes not located |

### 1d. Today's recurring-format output (September 27)

`cren-article-v1.0.2` — "Columbus Issued 17 Demolition Permits in August 2026." CREN bar chart hero (`image_role: DATA`, `image_provenance.type: CREN_GRAPHIC`). Editorial gate: PASS 18/18. Schema: PASS. Image plan: `SOURCE_ASSET`. Hashes verified. The September 26 image-policy amendment (CREN chart and map as image ladder step 2) enabled this package after four consecutive `NO_QUALIFYING_STORY` days. Vercel import: PENDING — not claimed.

---

## 2. Production throughput

| Metric | Value |
|---|---|
| Article packages committed (Sep 20–26) | 3 (Sep 20, 21, 22) |
| NO_QUALIFYING_STORY days (Sep 20–26) | 4 (Sep 23, 24, 25, 26) |
| Total publications within Sep 20–26 window | **UNMEASURED** — Vercel import and publication not confirmed from this environment |
| Operator-verified live count as of Sep 22 | 105 (from `briefs/2026-09-23-seo-report.md`; current count not updated) |
| Last verified publication timestamp | 2026-09-22T15:13:38.784353Z (operator-supplied; not refreshed this run) |
| Paid image generation | Off (owner policy; unchanged) |
| Paid revisions | Off (owner policy; unchanged) |
| Cloud importer (Vercel) | Enabled per operator; current queue state not verified this run |
| Image hold (Dublin Metro Center) | Active — `REAL_PHOTO_RESEARCH_REQUIRED`; requires supervised correction path |

**Structural constraint confirmed across four consecutive days:** The binding production gap is not story discovery but the mismatch between newsworthy subjects (new/proposed construction, demolitions of obscure mid-century buildings, zoning-code corridors) and rights-cleared redistributable documentary photographs of those specific subjects. Wikimedia Commons holds redistributable photos of existing, prominent Columbus landmarks, but not the subjects generating current news. The September 26 image-policy amendment (CREN chart → context photo → data card ladder) partially addresses this by enabling data-driven stories without a documentary photograph; it does not resolve stories requiring a specific site photograph.

---

## 3. Coverage analysis

**Basis:** 13 committed JSON files plus cross-reference to the prior SEO report's operator-confirmed live counts. The full live corpus (105 articles) was not audited directly this run. Claims below are limited to what is visible in the repository.

### 3a. Articles committed September 20–26 by area and topic

| Area | Topic | Angle |
|---|---|---|
| Near East Side / King-Lincoln Bronzeville | Infrastructure / Neighborhoods | $7M Mt. Vernon Avenue Phase 1 groundbreaking Sep 16; first protected bike lane in neighborhood; two-segment corridor from MLK Blvd to Champion Ave |
| Far East Side / Southeast Columbus | Development / Affordable housing | Motherful nonprofit closes on 100 Noe Bixby Rd; 18-bedroom co-housing for single mothers; nonprofit direct ownership model |
| Dublin, Ohio | Development / Office market / Zoning | 210-acre Metro Center rezoning; 90+ acres of surface parking targeted for mixed use; P&Z work session Sep 17; Council vote winter 2026-27 |

### 3b. Areas and topics with no committed coverage this week

These are gaps in the repository's committed packages for September 20–26. They may or may not represent gaps in the full 105-article live corpus, which was not audited.

| Area / topic | Last known coverage in repository | Notes |
|---|---|---|
| German Village | Sep 4 live article (Cedar Square 3-2 vote) — confirmed in prior SEO report; not in this run's repository files | Prior SEO report corrected earlier claims; do not assert zero coverage. Possible follow-up: community opposition to Cedar Square (Sep 26 social listener Item A — snippet only, unverified date) |
| South Side Columbus | Sep 6 live article (150-unit affordable groundbreaking) — confirmed in prior SEO report | Sep 27 demolition permits show ZIP 43207 is the week's busiest demolition area; no neighborhood feature article |
| Franklinton | Not visible in committed articles; prior SEO reports flag as repeatedly researched but never landed | Active leads (see Section 5) |
| Downtown Columbus | Sep 14 (OSU Moritz Law), Sep 15 (Diocese Gay Street advance) — both in repository | Diocese Sep 22 hearing outcome is unconfirmed (see Section 5) |
| Clintonville | Not in Sep 20–26 committed articles | Sep 26 social listener Item B: CU snippet suggests "iconic Clintonville building" redevelopment (likely Mozart's Bakery), unverified date, 403-blocked |
| Upper Arlington | Not visible in committed articles | No current verified lead in briefs this week |
| Worthington | Not visible in committed articles | Reporting fully verified Sep 24 (Democracy Before Developers petition); held only on NEEDS_IMAGE (see Section 5) |
| Arena District | Not visible in committed articles | One Twenty Vine (242-unit, 120 Vine St.) verified Sep 24–25; held on NEEDS_IMAGE (see Section 5) |
| Industrial / suburban commercial | Dublin Metro Center touches office-to-mixed-use | Gahanna Flex Park (36k sq ft flex-industrial) verified Sep 26; single origin, pending council (see Section 5) |
| Office market overview | Dublin Metro Center covers one suburban-office rezoning | No standalone office-market analysis |

### 3c. Source diversity (Sep 20–26 committed packages)

| Article | Primary source records | Secondary records | Notes |
|---|---|---|---|
| Sep 20 Mt. Vernon | 2 (City of Columbus: Engage Columbus project page; DPS fact sheet) | 5 (WOSU, Columbus Navigator, NBC4, Hoodline, NewsBreak) | NBC4 listed as HTTP 200; nbc4i.com is 403-blocked from Sep 23 onward — may have been accessible on Sep 20 |
| Sep 21 Motherful | 1 (motherful.org) | 2 (Columbus Underground at 200, NBC4) | CU listed as HTTP 200; CU is 403-blocked from Sep 23 onward — may have been accessible on Sep 21. NBC4 listed at unknown status |
| Sep 22 Dublin Metro Center | 2 (City of Dublin: Tell Dublin project page, APA award press release) | 4 (ABC6, CWColumbus, Columbus Underground, MSN/CBF) | CU listed without confirmed HTTP status; MSN/CBF is a secondary aggregation |

Five unique publishers appeared across the three packages: City of Columbus (2), City of Dublin (2), WOSU, Columbus Navigator, NBC4, Hoodline, NewsBreak, Columbus Underground, ABC6, CWColumbus, MSN/CBF. Two independent origins appeared in the source ledger for each article, though independence across different hostnames has not been individually verified for syndicated copies.

---

## 4. Source access status

| Source | Status this week | Notes |
|---|---|---|
| Columbus Underground (columbusunderground.com) | HTTP 403 (persistent from Sep 23) | Primary discovery/verification origin; its absence weakens cross-origin verification for most Columbus leads |
| NBC4 / WCMH (nbc4i.com) | HTTP 403 (Sep 23–26 newsroom runs) | Primary carrier for WWCD/Brewery District and other local stories |
| Columbus Business First / bizjournals | Paywalled / blocked | Original carrier for One Twenty Vine, Ares/Rickenbacker |
| The Columbus Dispatch (dispatch.com) | Blocked in prior runs | |
| Axios Columbus | Blocked in prior runs | |
| Columbus.gov (city records, open data) | Reachable (200); ArcGIS FeatureServer reachable | Primary records for city permits, zoning documents |
| Columbus Navigator (columbusnavigator.com) | Reachable (200) | Confirmed Sep 24–25 |
| WOSU (wosu.org) | Reachable (200) | Confirmed Sep 24 |
| Hoodline (hoodline.com individual pages) | Reachable (200) | Confirmed Sep 25–26 (individual article pages; listing page blocked) |
| Wikimedia Commons API | Reachable (200) | Confirms redistributable photos of existing landmarks; no photos of most current newsworthy subjects |
| yourresearchresource.com (Colliers Weekly Review) | Reachable (200) | Confirmed Sep 25–26 |
| City of Dublin (dublinohiousa.gov, telldublin.dublinohiousa.gov) | Reachable (200) | Confirmed Sep 22 |
| City of Worthington (worthington.org) | Reachable (200) | Confirmed Sep 24 |
| FRED / St. Louis Fed (fred.stlouisfed.org) | Reachable (200) per Sep 27 run; blocked via proxy in prior runs | FHFA HPI Q2 2026 (ATNHPIUS18140Q = 351.14) is the latest available; Q3 2026 not yet released |

---

## 5. Social-listener themes and five evidence-led assignments for next week

Social-listener briefs for September 23–26 are read as untrusted idea queues, as required by the cloud handoff. Every lead must be independently verified against current primary and independent sources before assignment.

### Verified leads from this week's social-listener briefs (unverified for newsroom use)

| Lead | Source (directly verified) | Status |
|---|---|---|
| One Twenty Vine, 120 Vine St., Arena District — 242-unit, 7-story apartment (NRI + HP Land Development; architect The Columbus Architectural Studio); Downtown Commission approval Sep 22, 2026; building permits next step | Columbus Navigator (Sep 24, 2026, full article fetched); Colliers Weekly Review (Sep 25, citing CBF Sep 22) | Reporting verified; held on NEEDS_IMAGE (only copyrighted renderings available; no redistributable documentary photo of the gravel-lot site) |
| Franklinton 610 W. Town St. — Grateful Development Partners, 40-unit apartments (1928 brick facade retained; 3 stories added; former Glass Axis site); East Franklinton Review Board conceptual review only, no formal vote; architect Archall Architects (Jonathan Grubb) | Hoodline (Sep 25, 2026, full article fetched) | Single origin; needs primary EFRB agenda/minutes + second independent origin |
| Gahanna Flex Park, 1675 Eastgate Pkwy — Como Development (Leland Vogel); 36,000 sq ft, 3 buildings × 8 units (1,500 sq ft each), 24 total; unanimous planning commission; pending Gahanna City Council | Hoodline (Sep 26, 2026, full article fetched) | Single origin; needs primary planning commission record + second origin |

**Snippet-only items (dates unverifiable; not admitted as leads):** German Village Cedar Square opposition follow-up (CU blocked); "iconic Clintonville building" redevelopment / Mozart's Bakery (CU blocked, date uncertain); 180-unit Fifth by Northwest corridor proposal (CU blocked, no details).

**Corrected item:** WWCD / 1036 S. Front St. was identified as a September **2025** story (not 2026) in `briefs/2026-09-26-social-listener.md`. Not admitted as a 2026 lead.

---

### Five evidence-led assignments for the week of September 28–October 4, 2026

Each assignment includes a duplicate check, the independently verifiable development required, and the reporting question to be treated as a hypothesis until verified.

---

**Assignment 1: Worthington Democracy Before Developers referendum petition**

**Primary record verified (Sep 24):** City of Worthington project page (worthington.org/802/Boundless-Harding-Hospital-Site) — 20.4 acres; S-1 to PUD rezoning; Municipal Planning Commission recommended 4-1 (2026-06-25); City Council approved Preliminary Plan 2026-07-20; 246 apartments + 2 single-family homes at ~12.2 du/acre; developer Elford Development; 10-year 75% tax abatement (Workforce Housing Program; 74 units at 80% AMI).
**Independent origins verified (Sep 24):** WOSU (nearly 4,000 signatures submitted Sep 20, validation expected mid-October, organizer Marty Shumway); Yahoo aggregation (3,976 signatures, 3,017 required at 35% threshold, $52.4M project value).
**Current status:** Held only on NEEDS_IMAGE. No rights-cleared photo of the site is obtainable from this environment; paid/AI generation is barred. The Sep 26 image policy amendment permits a CREN data card when no photo and no chart serve the story — a data card built from the verified public-record facts (unit count, acreage, abatement value, AMI threshold) would satisfy the image contract.
**Next milestone:** Franklin County Board of Elections signature validation (expected mid-October 2026). The current hook is the petition submission and validation timeline.
**Duplicate check:** No prior CREN article on the Worthington 445 E. Dublin-Granville Rd / Harding Hospital site is visible in the repository. Sep 24 newsroom receipt confirms no prior CREN coverage found in discovery.
**Reporting question:** Is the Democracy Before Developers referendum petition on track to survive validation and reach a voter ballot — and what specific design or affordability commitments in the City Council approval are driving the community opposition?
**Discrepancies to reconcile before drafting:** Unit count is 246 apartments + 2 single-family homes (not "248 apartments"); signature threshold is ~3,000 per WOSU vs. 3,017 at 35% per Yahoo — pin to Franklin County Board of Elections or Worthington clerk.

---

**Assignment 2: One Twenty Vine Arena District apartment proposal**

**Primary record needed:** Downtown Commission case COA2600944 meeting minutes or agenda for September 22, 2026 (not independently fetched; verified via Columbus Navigator Sep 24 and Colliers Weekly Review Sep 25).
**Secondary records verified:** Columbus Navigator (Sep 24, full article, 242-unit, 7-story, HP Land Development + NRI, architect The Columbus Architectural Studio; nine consolidated parcels + right-of-way; skywalk to Kilbourne Garage; no construction timeline announced; building permits next step); Colliers Weekly Review (Sep 25, citing Columbus Business First Sep 22).
**Current status:** Held on NEEDS_IMAGE — only the architect's copyrighted design renderings are available; public display in a news article or city case file is not redistribution permission. The site is an open surface parking lot at 120 Vine St. in the Arena District. An owner documentary photograph of the lot would satisfy the image contract.
**Duplicate check:** No prior CREN article on One Twenty Vine or 120 Vine St. is visible in the repository. First appeared as a social-listener verified lead Sep 25, 2026.
**Reporting question:** What does Nationwide Realty Investors' second consecutive Vine Street residential project — following Two Twenty Vine at 220 Vine St. — mean for the Arena District's balance between public parking access and residential density near Nationwide Arena?
**Photo request:** 120 Vine St. surface parking lot, Arena District (between Vine and nationwide Arena); before any construction begins; no interior access needed.

---

**Assignment 3: Diocese / 197 E. Gay St. Downtown Commission outcome**

**Prior coverage:** `frontend/content/articles/2026-09-15-columbus-downtown-commission-diocese-gay-street-demolition.json` — the advance story (hearing confirmed September 22).
**What happened Sep 22:** The Downtown Commission held its meeting. A Columbus Business First social-post headline stated the plan "stalls after commission vote," but the full article was not fetchable (paywalled). The primary September Downtown Commission meeting minutes have not been posted as of Sep 23 (the board page at columbus.gov shows minutes only through April 2026 and agendas only through June 2026 as of that run).
**Development needed:** Primary Downtown Commission September 2026 minutes or agenda posted at columbus.gov, independently fetchable, confirming the vote and its outcome. When posted, the advance story at Sep 15 becomes a natural predecessor for an outcome story.
**Duplicate check:** The Sep 15 article is the existing CREN coverage — an advance piece on the upcoming hearing. A verified outcome story (the commission's decision, the next steps for the Diocese, and any conditions attached) would be a distinct, sequential piece. Do not republish the advance as a result story without the meeting record.
**Reporting question:** Did the Downtown Commission vote approve, deny, or condition the Diocese's request to demolish the former Gay-Broad Connector building at 197 E. Gay St. and replace it with surface parking — and what does the outcome mean for the Diocese's timeline and options?
**Photo request:** 197 E. Gay St. building exterior (the subject of the demolition request) — a documentary photo of the building's current condition before any approved demolition.

---

**Assignment 4: Franklinton 610 W. Town St. — Grateful Development Partners**

**Verified (Sep 26 social listener):** Hoodline (Sep 25, 2026, full article fetched): 40-unit apartment building, former Glass Axis / Columbus Glass Art Center site (relocated 2024); architect Archall Architects (Jonathan Grubb); 1928 brick facade retained; 3 new stories added behind it; corrugated metal panels; 48-car rear lot; East Franklinton Review Board took conceptual review on the design — no formal vote; board sign-off required before construction under Columbus City Code Chapter 3323. Applicants plan to return for final approval.
**Development needed before assignment:** (a) Primary East Franklinton Review Board agenda or minutes for the September 2026 meeting, fetchable from Columbus.gov or the board's direct record — confirming the date, the conceptual review result, and the board's specific concerns or requests for changes before final approval; (b) a second independent origin beyond Hoodline (e.g., Columbus Underground or NBC4 covering the board meeting, once accessible).
**Duplicate check:** No prior CREN article on this project is in the repository. The Sep 24 and Sep 25 social listener briefs held it as a snippet; Sep 26 brief promoted it to a verified lead (material change). Not previously in any CREN article.
**Reporting question:** What specific changes is the East Franklinton Review Board asking Grateful Development Partners to make before it will give final approval to the 610 W. Town St. design — and what does the board's close-but-not-yet posture reveal about how Franklinton is navigating industrial character alongside accelerating residential infill?
**Photo request:** 610 W. Town St., Franklinton — the 1928 brick facade being retained; the broader former Glass Axis site; time-sensitive before construction begins.

---

**Assignment 5: Gahanna Flex Park — Como Development (suburban flex-industrial)**

**Verified (Sep 26 social listener):** Hoodline (Sep 26, 2026, full article fetched): 36,000 sq ft, 3 buildings (12,000 sq ft each), 24 units at 1,500 sq ft each, 1675 Eastgate Pkwy, Gahanna; developer Como Development (Leland Vogel, Galena-based); parcel ID 025-006522; unanimous planning commission approval; first reading of construction agreement at Gahanna City Council (final vote date unclear); target tenants: contractors, automotive, print, office, retail, local service.
**Development needed before assignment:** (a) Primary Gahanna planning commission meeting record (agenda, minutes, or vote record) confirming the approval vote and its date; (b) a second independent origin beyond Hoodline.
**Gap this fills:** The repository's committed articles and the week's social-listener leads are almost entirely residential or mixed-use. This is the week's only suburban commercial/light-industrial story and the first Gahanna development covered in the repository. Rickenbacker logistics transactions have appeared in the Colliers Weekly Review, but no CREN article has addressed suburban flex-commercial.
**Duplicate check:** No prior CREN article on Gahanna Flex Park or 1675 Eastgate Pkwy is visible in the repository. Confirmed new lead in the Sep 26 social listener.
**Reporting question:** Does the Gahanna Flex Park model — small 1,500-square-foot units for contractors, auto shops, and print shops — reflect a documented shortage in Central Ohio's suburban small-business real estate supply, and what does Gahanna's unanimous planning commission vote say about how suburban Columbus municipalities are weighing light-industrial uses against residential growth pressure?

---

## 6. Open workflow items

The following items are carried forward from prior reports and confirmed active as of this run:

| Item | Status | Action required |
|---|---|---|
| Dublin Metro Center (Sep 22) held at import — `REAL_PHOTO_RESEARCH_REQUIRED` | Active (confirmed in `briefs/2026-09-23-seo-report.md`) | Supervised editor correction path: supply rights-cleared photo per the image ladder, revalidate evidence, obtain new proof. Do not overwrite the GitHub JSON expecting automatic correction. |
| Sep 20 and Sep 21 articles: `AI_GENERATED` image provenance | Active | These packages violate the current image policy. They should not be imported as-is. Correction via the supervised path, or held until owner supplies a rights-cleared photo. |
| HTTP 403 blocks on CU, NBC4, CBF, Dispatch, Axios | Active (persistent Sep 23–27) | These are the dominant discovery and full-text verification constraint. Resolving them is the single highest-leverage source-access lever. |
| Downtown Commission September 2026 minutes not posted | Active as of Sep 23 | Monitor columbus.gov Downtown Commission board page; post when minutes appear. Enables Diocese Gay Street outcome story (Assignment 3 above). |
| City Bulletin PDF not text-extractable | Active (Sep 25) | The SR-161 / Northland corridor Zone In ordinance in City Bulletin #38 (2026-09-19) could not be read from the fetched PDF. A text-extractable format would unlock zoning-code stories. |
| Franklinton 610 W. Town St. image | Active | Owner photo of the 1928 brick facade is time-sensitive (before construction begins). |
| 2260 Lockbourne Rd (43207) demolition | Active | South Side commercial site with 5 August demolition permits; before-teardown photo is time-sensitive. |
| One Twenty Vine (120 Vine St.) image | Active | Owner photo of open surface lot before any groundbreaking. |

---

## 7. Evidence audit

- **Article counts:** Verified directly from `frontend/content/articles/*.json` (13 files). Live corpus count (105) is operator-supplied as of Sep 22 and not recomputed here.
- **Newsroom run receipts:** Read directly from `frontend/content/newsroom-runs/2026-09-2[3-7].json` for Sep 23–27.
- **Social-listener leads:** Verified directly from `briefs/2026-09-25-social-listener.md` and `briefs/2026-09-26-social-listener.md`.
- **Prior SEO report corrections incorporated:** `briefs/2026-09-23-seo-report.md` corrections to source types, coverage gaps, and the Dublin image hold are carried forward. No prior correction is promoted to a current finding without fresh evidence.
- **Search volume, rankings, appreciation, engagement, sentiment:** All **UNMEASURED**. No HIGH/LOUD/trending labels, market superlatives, or coverage-gap absolutes from snippets or article counts.
- **Assignment premises:** All five are framed as reporting questions requiring independent verification. Project status, unit counts, approval dates, and developer names cited above trace to the directly fetched sources listed. No claim is projected or rounded.
- **Drive save:** attempted below. If Drive access fails, this is recorded as `HANDOFF_BLOCKED`.

---

*Prepared by cre-news-weekly-seo v2. September 27, 2026. Repository-based analysis only; no publication actions performed.*
