# Source repair — three uncited live articles (2026-09-04)

The site-quality `sources` gate found three live articles that cited nothing: no inline
links, no named outlet, and no `editorial_review_jobs` row. All three were published
Aug 17–19, 2026, while the publish pipeline was running without `DATABASE_URL`, so the
ledger requirement never ran. Each has now been researched from scratch, corrected,
re-linked, and given a full source/claim/entity ledger through
`frontend/scripts/repair-article-sources.mjs`, which runs the same deterministic gate as
`publish-article.mjs` but updates the existing row instead of inserting a new one. The
canonical URLs are unchanged, per the corrections policy.

## 1. Garver YMCA / CMHA

`/blog/former-garver-ymca-site-sold-to-cmha-for-216-affordable-units`

Headline corrected from "Former Garver YMCA Site Sold to CMHA for 216 Affordable Units"
to "CMHA Seeks 216 Affordable Apartments at Closed Garver YMCA Site". The YMCA has
*agreed to sell*; no closed sale is on the record.

Sources added:

- YMCA of Central Ohio, Jerry L. Garver YMCA Closure FAQ (primary) — https://ymcacolumbus.org/garverfaq
- YMCA of Central Ohio, 10-year vision / footprint release, Feb 16 2026 (primary) — https://ymcacolumbus.org/news/ymca-central-ohio-aligns-its-footprint-long-term-sustainability-part-10-year-vision
- NBC4 WCMH-TV, "Former Columbus YMCA targeted for apartment development" — https://www.nbc4i.com/news/local-news/former-columbus-ymca-targeted-for-apartment-development/amp/
- NBC4 WCMH-TV, "Residents look for answers as YMCA building closes after 30 years" — https://www.nbc4i.com/news/local-news/columbus/residents-look-for-answers-as-ymca-building-closes-after-30-years/amp/
- 614NOW, "After 30 years, Southeast Columbus YMCA closes amid sustainability concerns" — https://614now.com/2026/cancellations/after-30-years-southeast-columbus-ymca-closes-amid-sustainability-concerns
- WSYX ABC6, "Columbus Metropolitan Housing Authority approves $100M in housing investments" — https://abc6onyourside.com/news/local/cmha-columbus-housing-authority-mixed-income-investments-affordable-apartments-falls-demorest-townhomes-rosebrook-village-reynoldsburg-senior-vouchers-central-ohio
- Franklin County Auditor address search for 1827 Livingston (returned a maintenance notice, no results)

Corrections:

- **Fabricated quote removed.** The article quoted the YMCA closure FAQ as saying the sale
  was made "so the site can continue serving the community in a meaningful way." That
  sentence is not in the FAQ. Replaced with the FAQ's actual language.
- **Wrong status removed.** "No formal site plan or zoning application has appeared in
  city records" was false by June: CMHA presented the plan to the Greater South East Area
  Commission and requested variances for building height, setback, parking, and
  first-floor residential units.
- **Wrong attribution removed.** "CMHA told NBC4 it was 'too early to discuss plans'" was
  a February statement made to WBNS, not NBC4, and stale by August. Cut.
- **Unverified pipeline list removed.** AspireCOLUMBUS, Cobblestone Manor, Flores
  Development scattered sites, and "Mercy on Main" as a comparison could not be verified
  from a fetched source. Replaced with CMHA's August 2025 $100M investment package, which
  is sourced.
- **Unsupported analysis removed.** The 24-units-per-acre density calculation, the claim
  that southeast Columbus is underserved "per square mile," and the OHFA LIHTC paragraph
  had no source behind them.

Could not verify: whether the deed has actually transferred (Franklin County Auditor
property search was offline for maintenance on Sept 4), the outcome of the July 15 area
commission committee vote, and whether the units would carry project-based vouchers.
All three are stated in the piece as open.

## 2. Kilbourne Run Sports Park

`/blog/columbus-reverses-250-fee-at-northland-s-new-kilbourne-run-sports-park`

Headline corrected from "Columbus Reverses $250 Fee at Northland's New Kilbourne Run
Sports Park" to "Columbus Opens Free Turf Hours at Kilbourne Run After Fee Fight". What
the city did was open designated fields for free walk-up play; the rental rate itself is
not documented as abolished.

Sources added:

- Columbus Recreation and Parks, park listing with open-access hours (primary) — https://columbusrecparks.com/parks/kilbourne-run-sports-park/
- Columbus Recreation and Parks, capital improvement project page (primary) — https://columbusrecparks.com/connect/about/capital-improvement-projects/kilbourne-run-sports-park/
- Columbus Recreation and Parks, Community Day listing (primary) — https://columbusrecparks.com/calendar/kilbourne-run-sports-park-community-day/
- WOSU Public Media, Apr 29 2026 — https://www.wosu.org/politics-government/2026-04-29/resident-frustrated-by-prices-at-kilbourne-fields-highlights-debate-about-use-of-columbus-parks
- "New Columbus sports park opens," Jul 30 2026 — https://www.aol.com/articles/columbus-sports-park-opens-000000000.html

Corrections:

- **Budget figure re-labeled.** "About 97 percent finished by late April" became "about 97
  percent of the budget" spent, which is what the city's project page actually says.
- **Unverified quote removed.** Elon Simms saying the city was "working through some of
  the kinks" appears in no fetched source. Cut; his sourced quotes remain.
- **Acreage corrected** from 62.67 to 62.666 acres, as the city lists it.
- **Truncated mayoral quote replaced** with the full sourced statement, paraphrased.

## 3. ALDI downtown

`/blog/aldi-will-build-a-downtown-columbus-grocery-store-by-2028`

Headline corrected from "ALDI Will Build a Downtown Columbus Grocery Store by 2028" to
"ALDI Plans a Downtown Columbus Grocery Store to Open in 2028" — an announcement, not a
completed commitment.

Sources added:

- Columbus State Community College announcement, Aug 18 2026 (primary) — https://www.cscc.edu/about/news/2026/ALDI.shtml
- WSYX ABC6, Aug 19 2026 — https://abc6onyourside.com/news/local/aldi-to-build-downtown-columbus-store-opening-2028-grocery-produce-cleveland-ave-spring-street-college-campus-students-faculty-staff-residents
- 614NOW, Aug 19 2026 — https://614now.com/2026/food-drink/discount-grocery-store-chain-lands-first-downtown-columbus-location
- NBC4 WCMH-TV, Discovery District economic development agreement — https://www.nbc4i.com/news/local-news/columbus/columbus-approves-economic-agreement-to-redevelop-discovery-district-parking-lots/amp/

Corrections:

- **Unattributed quote fixed.** Laura Bauer's "can look forward to a convenient,
  affordable way to stock up on everyday essentials" now carries her title, the
  announcement it came from, and a linked source. It checked out verbatim.
- **Wrong attribution fixed.** "Largely vacant" was attributed to president David T.
  Harrison; it is the college's description of the parcel, not a Harrison quote.
- **Unsupported claim removed.** "Harrison said food insecurity is a leading non-academic
  barrier to student success" does not appear in any fetched source. Replaced with what
  Harrison actually said.
- **Bad arithmetic removed.** "A roughly 18-month build once ground breaks" was invented
  from a spring 2027 start and an unspecified 2028 opening. Replaced with the honest span.
- **Meta description corrected.** It claimed "county records show"; no county record was
  fetched for this story.

Could not verify: the "first new national-retailer grocery store downtown in decades"
claim against an independent retail-history record. It is now labeled as the college's
characterization.

## Verification

- `SELECT id FROM articles WHERE status='live' AND body NOT LIKE '%http%'` → 0 rows.
- `npm run verify:site -- --target production` → `sources` PASS ("all 95 live articles cite
  at least two source domains"), `links` PASS. Remaining blocking failures
  (`disclosure-funnel`, `images-policy`, `images-reachable`, `data-readiness`, `canonicals`)
  are pre-existing and unrelated to these three articles.
- `npm run build`, `npm run lint`, `npm run test:image-pipeline` all pass.

## Known issue, not fixed here

The Garver article carries `area_slug = "southeast-columbus"`, which is not a real area in
`frontend/lib/franklin-areas.ts`. `/areas/southeast-columbus` returns 404. No link to it is
rendered, so nothing is broken for readers, but the article is missing from its area hub.
