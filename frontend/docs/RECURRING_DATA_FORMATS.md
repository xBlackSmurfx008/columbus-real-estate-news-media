# CREN recurring data formats

Owner approved September 26, 2026 (`docs/IMAGE_POLICY.md`, section C). These formats come from primary sources that were
reachable without a block on September 26, 2026. Each one ships with a CREN_GRAPHIC hero built by
`scripts/render-cren-chart.mjs`, so none of them waits on a photograph or on a 403 blocked news site.

**Rule for the newsroom routine:** when no breaking story clears the full verification and image bar by the end of
discovery, produce the format that is due (schedule below) instead of returning `NO_QUALIFYING_STORY`. A format still
passes every writing policy gate: two independent origins where claims go beyond the dataset, a stated limitation, no
predictions, and no transaction advice. If the data pull fails, say so in the brief and hold; never estimate numbers.

## Schedule

| Format | Cadence | Due | Primary source | Hero |
|---|---|---|---|---|
| 1. Permit Pulse | Weekly | Monday run | Columbus Building Permits (CC0) | Bar chart, new units by week |
| 2. Biggest Permits of the Week | Weekly | Thursday run | Columbus Building Permits (CC0) | Site map of the top 5 |
| 3. Demolition Watch | Monthly | First Tuesday | Columbus Building Permits (CC0), plus HRC agendas | Map of demolition permits |
| 4. Zoning Watch | Monthly | Second Wednesday | Council Zoning Variances (CC0), Columbus Legistar | Map of variance sites |
| 5. Columbus Home Price Index | Quarterly | Run after FHFA's quarterly release | FRED series ATNHPIUS18140Q (FHFA, public domain) | Line chart |
| 6. What Rent Costs Here | Annual, plus refresh | October run after HUD posts new Fair Market Rents | HUD Fair Market Rents (public domain) | Bar chart by bedroom count |

If the due day's run already produced a qualifying breaking story, the format moves to the next run. Never produce more
than two articles per run in total.

## 1. Permit Pulse (weekly)

**Question it answers:** How many new homes did Columbus permit last week, and where?

**Source:** City of Columbus Building Permits, Open Data hub item `f7a785b863454d96a0fe3f5aa5368e7d`, license CC0 1.0.
Feature service: `https://services1.arcgis.com/9yy6msODkIBzkUXU/arcgis/rest/services/Building_Permits/FeatureServer/0`.
Fields used: `GENERAL_TYPE`, `UNITS`, `ISSUED_DT`, `SITE_ADDRESS`, `B1_SITUS_ZIP`, `G3_VALUE_TTL`, `B1_ALT_ID`.

**Query (units by type for a date range):**

```bash
B="https://services1.arcgis.com/9yy6msODkIBzkUXU/arcgis/rest/services/Building_Permits/FeatureServer/0"
curl -s -G "$B/query" \
  --data-urlencode "where=GENERAL_TYPE LIKE '%New Structure' AND ISSUED_DT >= DATE '2026-09-14' AND ISSUED_DT < DATE '2026-09-21'" \
  --data-urlencode "groupByFieldsForStatistics=GENERAL_TYPE" \
  --data-urlencode 'outStatistics=[{"statisticType":"count","onStatisticField":"OBJECTID","outStatisticFieldName":"permits"},{"statisticType":"sum","onStatisticField":"UNITS","outStatisticFieldName":"units"}]' \
  --data-urlencode "f=json"
```

Repeat for each of the prior 8 weeks to build the chart series. Use only `GENERAL_TYPE` values ending in
"New Structure". `MEP`, `Fire Protection` and other sub types repeat the same units and must not be added.

**Known limits to state in the story:** one project can carry several structural permits (one per building), so permit
counts are not project counts; units are as entered by applicants; the city updates the feed daily and late entries can
shift a week's total. On September 26, 2026, year to date 2026 new structure permits carried 3,968 multifamily units,
660 one to three family units and 512 commercial units (use a fresh pull, not these figures).

**Original contribution:** week over week and year over year comparison, and the ZIP codes with the most units.

## 2. Biggest Permits of the Week (weekly)

**Question:** What are the five largest construction permits Columbus issued this week?

**Query:** same service, `where=GENERAL_TYPE LIKE '%New Structure' AND ISSUED_DT >= DATE '<start>'`,
`orderByFields=G3_VALUE_TTL DESC`, `resultRecordCount=15`, `returnGeometry=true`, `outSR=4326`. Group permits that
share an address or `B1_PARCEL_NBR` into one project before ranking.

**Reporting:** for each of the top five, record the address, units, declared value and permit number, then look for one
independent origin (Legistar, a Downtown Commission or HRC agenda, the developer's own page) that names the project.
A permit without a second origin can still be listed with only the permit facts; do not guess the developer or use.

**Hero:** map kind, one point per project, primary point on the largest. Use OSM street geometry for context lines and
print its attribution.

**Limit to state:** declared value is the applicant's construction estimate, not a sale price or appraisal.

## 3. Demolition Watch (monthly)

**Question:** Which buildings did Columbus permit for demolition last month?

**Query:** `where=GENERAL_TYPE LIKE '%Demolition' AND ISSUED_DT >= DATE '<first of last month>' AND ISSUED_DT < DATE '<first of this month>'`.
In 2026 through September 26 there were 114 such permits (55 commercial, 52 one to three family, 7 multifamily).

**Reporting:** cross check addresses inside historic districts against the Historic Districts and Register of Historic
Properties layers on the same Open Data hub, and against Historic Resources Commission agendas. This is the format that
would have carried the WWCD building story with a map of 1036 S. Front St. instead of a missing photo.

**Hero:** map of permit points; historic district polygons in gold when relevant.

## 4. Zoning Watch (monthly)

**Question:** Which properties asked City Council for zoning variances this month, and what are they asking for?

**Source:** Council Zoning Variances, Open Data hub item `411516ef8ebc4f6e9aa5eec519ab6f1c`, CC0 1.0, map service
`https://maps2.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/2` (updated September 16, 2026).
Council legislation and agendas: `https://columbus.legistar.com/Calendar.aspx` (reachable). Base zoning:
hub item `96f7642a62f84db997f9e1db4a776995`, CC0.

**Reporting:** pair each new variance with its Legistar ordinance for the requested change and hearing date. The SR 161
/ Northland corridor rezoning fits here: map the corridor instead of looking for a single building to photograph.

**Hero:** map of variance points or polygons.

## 5. Columbus Home Price Index (quarterly)

**Question:** How fast are Columbus home values changing, by the government's repeat sales measure?

**Source:** FHFA All Transactions House Price Index for the Columbus, OH metro, FRED series `ATNHPIUS18140Q`:
`https://fred.stlouisfed.org/graph/fredgraph.csv?id=ATNHPIUS18140Q` (no key needed; FHFA data is public domain).
Latest values on September 26, 2026: 2025 Q4 342.87, 2026 Q1 346.10, 2026 Q2 351.14 (index values; read the base period from the FRED series page before citing it).

**Reporting:** quarter over quarter and year over year percent change; compare with the national series `USSTHPI`.
Include a second origin for interpretation (the FHFA release page itself). No forecasts.

**Limit to state:** an index of repeat sales and refinance appraisals, not a median sale price; it lags by a quarter.

## 6. What Rent Costs Here (annual)

**Question:** What does HUD say a typical Columbus apartment rents for this year, by bedroom count?

**Source:** HUD Fair Market Rents, `https://www.huduser.gov/portal/datasets/fmr.html`, Columbus, OH HUD Metro FMR Area.
Public domain federal data. Compare with the prior year's FMR table.

**Why it matters for CREN:** renter demand is the strongest signal on the site (affiliate clicks and the only lead are
renter shaped, per the September 26 CMO directive), and the format links naturally to rental guides.

**Limit to state:** FMR is set at roughly the 40th percentile of gross rent including utilities, for voucher program
use; it is not an average asking rent.

## Building the hero

```bash
cd frontend && npm ci   # once per run, provides sharp
node scripts/render-cren-chart.mjs --spec /tmp/spec.json --out content/images/2026-09-28-columbus-permit-pulse.png
```

The script prints `git_blob_sha` and `source_sha256` for the `cloud_image_asset` receipt. It compares the chart
against committed images and re-seeds its header and footer bands until it clears the near-duplicate guard; if it
still cannot, it stops with `CHART_TOO_SIMILAR_TO_EXISTING_IMAGE` and you use the data card (`render-cren-graphic.mjs`).
Spec examples are in the header of `scripts/render-cren-chart.mjs`. Inspect the PNG yourself before attesting the
visual review. Caption pattern: "CREN graphic. Data: City of Columbus Building Permits (CC0), pulled Sept. 28, 2026."
Set `image_brief.image_role: "DATA"` and `image_provenance.type: "CREN_GRAPHIC"` as described in `docs/IMAGE_POLICY.md`.
