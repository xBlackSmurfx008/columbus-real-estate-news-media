# CREN neighborhood coverage process

CREN targets one strong `Neighborhoods` article each week and may publish a second when the records support a distinct,
useful story. This is a site-wide weekly lane, not a quota of one or two articles for every neighborhood. Every article
must map to one specific `area_slug`, carry the `neighborhood` tag, and appear on that area's hub.

## Weekly workflow

1. Run `npm run newsroom:neighborhood-report`. It reports the Monday-to-Sunday count, remaining weekly capacity, the
   least-recently covered priority areas, and the approved source registry.
2. Start with primary records: a city permit or zoning application, commission agenda/result, ordinance, parcel record,
   transportation plan, school-district record, or a dated public dataset.
3. Confirm the record with a second independent fetched source. A second page that repeats the same press release is not
   independent verification.
4. Pick a story only when the local consequence is specific. Useful triggers include a new filing, a documented status
   change, a public decision, a permit milestone, a transaction record, or a material data change.
5. Explain what changed, what the record proves, what remains unresolved, and the next dated checkpoint. Do not turn an
   application into an approval or a one-month market movement into a trend.
6. Submit through `publish-article.mjs`. Neighborhood articles require `category: "Neighborhoods"`, a specific
   `area_slug`, and tags for `columbus-ohio`, `central-ohio-real-estate`, the topic, the area, and `neighborhood`.
7. The normal machine gate, human scorecard, image review, and authenticated publication gate still apply.

## Primary source desk

- City Development Commission agendas/results: https://www.columbus.gov/Business-Development/Building-Zoning-Services/Boards-and-Commissions/Development-Commission
- City area commissions and meeting map: https://www.columbus.gov/Government/City-Council/Community-Engagement
- Columbus legislation: https://columbus.legistar.com/Legislation.aspx
- Building and zoning permits: https://portal.columbus.gov/Permits/Welcome.aspx
- Columbus zoning applications GIS: https://gis.columbus.gov/arcgis/rest/services/Applications/Zoning/MapServer
- Franklin County Auditor tools: https://auditor.franklincountyohio.gov/Auditor/Online-Tools
- Franklin County Recorder search: https://www.franklincountyohio.gov/Agency-Directory/Recorder/Real-Estate/Public-Records-Search
- MORPC data and maps: https://www.morpc.org/programs-services/data-mapping-resources/
- U.S. Census Bureau data: https://data.census.gov/

For municipalities outside Columbus, use the municipality's own council, planning, zoning, permit, school, and public
records pages before using news coverage. Keep the exact record URL—not merely the agency homepage—in the article ledger.
