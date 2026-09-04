# Flagship area hubs — selection and measurement (2026-09-04)

Owner plan 2026-09-04, P1 item 8: build 5 to 10 flagship neighborhood hubs on
the German Village model and measure organic entrances, follows, and leads by
area. Do not try to make roughly 70 thin hubs equally deep.

This document records which areas were chosen, the evidence behind each pick,
what was built, how the measurement works, and what only the newsroom can fix.

## How the picks were made

Hub traffic could not drive the selection. Over the 30 days to 2026-09-04 the
whole `/areas/*` tree drew 3 page views: `/areas/columbus-city-avg` 2 and
`/areas/upper-arlington` 1. So four inputs were used instead.

1. **Published CREN depth.** How many live articles are already filed to the
   area. Coverage is the only thing that makes a hub genuinely different from
   the other 85.
2. **Canonical market data.** Whether `lib/market-data.ts` carries a home value
   and rent series for that exact geography. An area with no series cannot show
   the German Village housing snapshot, and we will not borrow a number from a
   neighbouring geography to fill the gap.
3. **Organic entrances by area.** Measured with the new rollup described below:
   search-referred page views on the hub plus on articles filed to that area.
   This is real audience signal that the hub pageview count hides, because
   almost all of our traffic lands on articles.
4. **Search opportunity and market weight.** Whether the area is a destination
   people search for, and whether the story has room to run.

### The evidence table

Article counts are live articles as of 2026-09-04. Organic entrances are the 30
days to 2026-09-04, from `npm run newsroom:area-performance`.

| Area | Live articles | Home value series | Rent series | Organic entrances (30d) | Flagship |
| --- | --- | --- | --- | --- | --- |
| Downtown | 13 | no | no | 7 | yes |
| Dublin | 7 | yes | yes | 3 | yes |
| Hilliard | 5 | yes | yes | 7 | yes |
| German Village | 4 | yes | no | 0 | yes |
| New Albany | 3 | yes | yes | 0 | yes |
| Upper Arlington | 3 | yes | yes | 2 | yes |
| Gahanna | 3 | yes | yes | 1 | yes |
| Arena District | 3 | no | no | 12 | yes |
| Columbus Citywide | 22 | yes | yes | 5 | no, see below |
| Bexley | 2 | yes | yes | 5 | not yet |
| Short North | 2 | no | no | 3 | not yet |
| Clintonville | 2 | no | no | 0 | not yet |
| Franklinton | 2 | no | no | 0 | no |
| OSU area | 0 | no | no | 0 | no |
| Westerville | 1 | yes | yes | 0 | not yet |
| Worthington | 0 | yes | yes | 0 | not yet |

## The eight flagship areas, and why each

**Downtown (`downtown-columbus`).** The deepest coverage of any single place we
have, 13 live articles, and 7 organic entrances in 30 days. The story is
coherent rather than scattered: an office tower conversion won a 2026
redevelopment award, the city dropped a new courthouse plan for renovation, a
grocery store is announced for 2028, and a park promoted as open was still
closed when we checked. That last pattern is the hub's editorial spine. The
constraint is real and stated on the page: no downtown home value or rent
series exists in our canonical data, so the snapshot shows the gap.

**Arena District (`arena-district`).** The highest organic entrance count of any
CREN area in the window, 12 across 20 article views, on only three articles.
That is the strongest demand signal we have anywhere in the area tree, and it
was invisible in the hub pageview number. The three stories tell one story: an
events and office district adding housing, with a 242-unit plan still in early
design and a 148-home conversion with published counts. Same data constraint as
Downtown, handled the same honest way.

**Dublin.** Second-deepest coverage at 7 live articles, a complete home value
and rent series, and the metro's strongest premium-suburb search demand. It
already carried a proof-cohort reality check, so the work here was the reporting
record, the comparison table, and the FAQ. Its coverage is unusually good for
conversion because it spans approvals, construction starts, schools, and events.

**German Village.** The model the owner pointed at, and it keeps earning the
slot: a contested 3-2 historic-review vote published on 2026-09-04, plus two
market stories that both say the same careful thing, that the sale sample here
is too small to read as a trend. It has a published neighborhood home value
series and no rent series, so the hub shows one and not the other.

**Hilliard.** Five live articles and a complete value and rent series, but the
real reason is the substitution story. Buyers priced out of Dublin search
Hilliard next, and both sides of that comparison now carry sourced numbers from
the same source and period. That is a comparison we can make honestly and most
competitors cannot.

**Upper Arlington.** The only hub with any organic entrance to the hub page
itself, the highest typical home value in our canonical data, a complete series,
and a live 2026 ballot question combining a $273.5 million bond with 4.9 mills.
A funding question that changes every owner's monthly cost is exactly the kind
of thing a hub should answer.

**New Albany.** Three live articles on the metro's largest economic story, the
data center and chip corridor, plus a complete series. National search interest
in Intel and Meta lands here, and our coverage answers it with the distinction
that matters: construction milestones are verifiable, while job counts,
household bill savings, and land value gains are still forecasts.

**Gahanna.** Three live articles, a complete series, a mid-price position that
makes it a genuine east-side comparison point, and a downtown redevelopment
question that is live and unresolved. We checked the Creekside sites twice and
found them cleared with construction unset both times. A hub that says so is
more useful than one that repeats a rendering.

### Deliberately not flagship

**Columbus Citywide.** It has the most articles, 22, but it is a metro region
page rather than a place people search for by name. It keeps its existing
proof-cohort reality check and content package, and it serves the flagship
programme as the metro baseline row in every comparison table.

**Franklinton** and **the OSU area.** Both currently render proof-cohort reality
checks, and those stay: removing shipped, sourced editorial content would be a
regression. Neither is a flagship. Franklinton has two live articles and no
canonical market series. The OSU area has zero live articles, so a flagship
reporting record for it would have nothing to cite. The OSU hub remains a renter
utility page rather than a reporting-backed hub.

**Bexley, Short North, Westerville, Worthington, Clintonville.** The bench. The
promotion rule is deliberate and testable: an area joins the flagship set when
it reaches four or more live articles AND either a canonical market series or a
30-day organic entrance count above the current flagship median. Bexley is the
closest: 5 organic entrances and a complete series, held back only by having two
articles. Short North and Clintonville are not in Zillow's neighborhood file, so
they would carry the same data gap as Downtown without Downtown's coverage
depth.

The flagship set is capped at ten in code, and the cap is enforced by a test.

## What was built

Everything below renders only for the eight flagship slugs. The other 78 hubs
are unchanged.

- **Reality checks for the five flagship areas that lacked one.** Downtown,
  Arena District, Hilliard, Upper Arlington, New Albany, and Gahanna now render
  the same module German Village does: the primary question, a short answer,
  best for and not best for, budget reality, the local-life stack, what changed,
  what to verify, and nearby substitutes. Dublin, German Village, and Columbus
  Citywide keep the proof-cohort versions they already had.
- **A reporting record on every flagship hub.** Each entry states what one
  published CREN story established, no more strongly than the story did, and
  links to it. Entries are stored as canonical article slugs and resolved
  against the live article set at render time, so a hub cannot cite coverage
  that was unpublished, renamed, or never existed. All 36 cited slugs were
  verified live on 2026-09-04.
- **A market comparison table.** The area against its price and type peers plus
  the Columbus metro baseline, on typical home value and observed rent. Every
  cell comes from the canonical set with its own period and source. A geography
  with no published series renders as "Not published", and the footnote names
  which areas those were.
- **An FAQ block with FAQPage structured data.** Three questions per hub. Where
  an answer rests on a published CREN story it links to it. Where an answer is
  about a missing number, it says the number is missing and why.
- **Sitemap priority.** Flagship hubs crawl weekly at priority 0.95. Tier
  assignment in `lib/consumer-insights.ts` is unchanged.
- **Area attribution for conversion.** The hub wrapper carries
  `data-area-slug`, which `FunnelTracker` already reads, so every funnel CTA
  click anywhere on a hub is attributed to the area with no per-CTA
  instrumentation. The seller card also carries `?area=`, which
  `captureAttribution` reads, so a seller lead stays attributable when session
  storage is unavailable.

## Per-area measurement

`lib/area-performance.ts` exposes `buildAreaPerformance()`, a pure rollup, and
`scripts/area-performance-report.mjs` runs it against the database:

```
DATABASE_URL=... npm run newsroom:area-performance -- --window 30
```

It reuses the telemetry that already shipped. Nothing parallel was invented and
`scripts/kpi-report.mjs` was not touched.

| Number | Source | Definition |
| --- | --- | --- |
| Organic entrances | `page_views` | Views on `/areas/<slug>` plus views on articles whose `area_slug` matches, where `referrer_host` is a search engine. A missing referrer is direct or unknown, never organic. |
| Hub views, visitors | `page_views` | All views and distinct visitor hashes on the hub page. |
| Follows, preferences | `activation_events` | `area_follow_start` and `preference_saved`, resolved by payload slug, hub path, or the `<slug>-area-hub` source convention. Same resolution the KPI report uses. |
| Funnel views, CTA clicks, submits | `funnel_events` | Grouped by the `area` dimension the funnel events already carry. |
| Leads, qualified leads | `leads` | Grouped by the lead's own area. Qualified means qualified, opportunity, or won. |

Two problems the module exists to solve:

1. `area` arrives as a slug from a hub path, a display name from a form or query
   parameter, and either from an activation payload. `normalizeAreaKey` folds
   all three onto one slug, so one area is never counted as two rows.
2. Test traffic is excluded by the shared predicate in
   `scripts/test-traffic-lib.mjs`, the same rule the KPI report applies. The
   rollup never re-derives it.

### Baseline, 30 days to 2026-09-04

52 organic entrances across all areas. 1 follow. 0 leads. The eight flagship
areas account for 32 of those 52 entrances, roughly 62 percent, on 8 of the 86
hubs. That is the number to move.

## What only the newsroom can fill

These are gaps this work deliberately left empty rather than inventing.

1. **No home value or rent series for Downtown, the Arena District, or the
   Short North.** Zillow's neighborhood file does not carry them. A named public
   source, a Columbus REALTORS district cut, or a sourced CREN analysis would
   let three high-demand hubs show a snapshot instead of a gap. Never guess
   these.
2. **No rent series for German Village.** The home value series exists and the
   rent series does not. Same rule applies.
3. **Thin reporting on three flagship areas.** New Albany, Gahanna, and the
   Arena District have three live articles each. The reporting record on those
   hubs is correspondingly short. Each has an obvious open thread: the Creekside
   construction schedule in Gahanna, the outcome of the 242-unit Arena District
   design, and whether any New Albany corridor forecast has turned into a
   verifiable result.
4. **Two open questions with dated checkpoints.** The Upper Arlington ballot
   question resolves at the election, and the Downtown grocery store has a 2028
   build date. Both need a follow-up story when the checkpoint arrives, or the
   hubs will quietly go stale while still reading as current.
5. **No local business, park, or event listings are asserted anywhere.** The
   local-life cards still open live map searches rather than claiming a curated
   list. Turning those into curated, verified places with last-verified dates is
   newsroom work under the source policy in
   `AREA_HUB_COMPLETION_PLAN_2026-08-25.md`, not something to generate.
6. **Bexley needs two more articles** to clear the promotion rule above. It has
   the data series and the organic signal already.
