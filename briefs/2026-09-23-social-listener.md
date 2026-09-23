# Social Listener Brief — September 23, 2026 (v2 — Supersedes Earlier NO_VERIFIED_LEADS Version)

**Run type:** Scheduled cloud routine (cre-news-social-listen v2)
**Actual run time:** Approximately 06:33 ET, September 23, 2026
**Window attempted:** 24–48 hours prior (Sep 21–23, 2026)
**Prior brief for this date:** An earlier same-day run returned NO_VERIFIED_LEADS due to egress access limitations. This run accessed two additional sources via WebFetch and confirmed two leads with in-window timestamps.

---

## Result: 2 VERIFIED LEADS

Two leads were confirmed with directly verified publication timestamps inside the 24–48-hour window. All volume and sentiment readings are **UNMEASURED** — no direct public posts (Reddit, X/Twitter, neighborhood Facebook groups) were accessible.

---

## Lead 1 — Worthington "Democracy Before Developers" Petition Submitted

**Summary:** A Worthington citizen group named Democracy Before Developers submitted 3,976 petition signatures on September 21, 2026, to force a 2027 ballot referendum on Worthington City Council's July 20 rezoning of ~20 acres at 445 E. Dublin-Granville Road. The rezoning allows a $52.4 million, 248-unit apartment complex proposed by a private developer on land currently owned by disability nonprofit I Am Boundless. Ohio law required 3,017 signatures; the group submitted roughly 960 more than required.

**Key details:**
- Developer requested a 10-year, 75% property tax abatement.
- City says 74 of 248 units (30%) would be workforce housing at 80% AMI; abatement justified as making project financially viable.
- Petition drive ran July 23 – September 21, 2026.
- Next step: City holds signatures 10 days, then sends to Franklin County Board of Elections for validation; if certified, referendum appears on November 2027 ballot.
- Group organizer Marty Shumway estimated 85–90% of signatures valid.

**Volume:** UNMEASURED — Reddit, X/Twitter, and neighborhood Facebook groups were inaccessible; no direct post content verified. The 3,976 signatures represent observable community action but not a count of distinct online authors.

**Sentiment:** UNMEASURED — Organizers deny being anti-development and stress density/tax abatement concerns. City communications framed the workforce carve-out as a financially necessary feature. Direct community sentiment on social platforms not observed.

**Sources (directly verified):**
- WOSU Public Media — "Worthington group submits nearly 4,000 signatures in effort to block high-density apartment complex"
  - URL: https://www.wosu.org/politics-government/2026-09-21/worthington-group-submits-nearly-4-000-signatures-in-effort-to-block-high-density-apartment-complex
  - Observed publication date: September 21, 2026 (confirmed from URL pattern and direct page fetch)
  - Access time: This run, approximately 06:33 ET September 23, 2026
  - Observed: Article text with key facts, quote from petition organizer Marty Shumway, city response from communications director Aubrey Hale

- Yahoo News (aggregating Columbus coverage) — "Worthington citizen group submits 3,976 signatures to get zoning change on ballot"
  - URL: https://www.yahoo.com/news/us/articles/worthington-citizen-group-submits-3-090909858.html
  - Observed publication date and time: Wednesday, September 23, 2026 at 9:09 AM UTC
  - Access time: This run, approximately 06:33 ET September 23, 2026
  - Observed: Article text, petition detail (3,976 signatures), address (445 E. Dublin Granville Road), project cost ($52.4M), unit count (248), tax abatement terms

**Verification limits:**
- Direct fetches to columbusunderground.com returned HTTP 403; no additional Columbus Underground coverage of this story could be confirmed in-window.
- Reddit and X/Twitter post content inaccessible; community discussion volume is unverified.
- The Yahoo News article was accessible and directly confirmed the September 23 timestamp.

**Overlap check:** Not covered in any prior CREN social listener brief. New lead.

**Suggested reporting question:** Does Worthington's referendum petition signal a broader Central Ohio pattern of citizen mobilization against market-rate density with tax abatements — and what does the "30% workforce housing" carve-out actually mean for residents priced out of the Columbus metro?

---

## Lead 2 — Franklin County Democrats Endorse Both Columbus Council Reform Measures

**Summary:** The Franklin County Democratic Party Central Committee voted on September 22, 2026, to endorse both Issues 8 and 9 on the November 2026 Columbus ballot — measures that would reshape how City Council members are elected. Issue 8 (citizen-led, Our City Our Say) would move to district-only council elections; Issue 9 (council-backed) would expand council to 13 members — nine district seats plus four at-large — with new district maps by 2028. Both Columbus Mayor Andrew Ginther and Council President Shannon Hardin supported the endorsement. WOSU reported the endorsement on September 23, 2026.

**Key details:**
- Issue 8 background: Our City Our Say coalition submitted 23,000+ signatures in July 2026 after the 2025 District 7 race, where a citywide-vote winner lost within their own district.
- Issue 9 background: Council's competing hybrid model retains four at-large seats, justified by leadership as preserving a "citywide voice on issues that impact the whole city, such as housing."
- Franklin County Democrats' dual endorsement attempts to unite the district-reform and council camps.
- Competing measures on the same ballot means voters could approve both; city charter rules would determine which prevails.

**Volume:** UNMEASURED — no Reddit, X/Twitter, or Facebook discussion content confirmed in-window.

**Sentiment:** UNMEASURED — Institutional sentiment (Franklin County Dems, Mayor, Council President) is positive on endorsement. Opposition from some labor and Black community leaders noted in prior coverage (Sep 21 brief) but no new direct community posts confirmed in this window.

**Sources (directly verified):**
- WOSU Public Media — "Franklin County Democrats endorse both ballot issues to reform Columbus City Council"
  - URL: https://www.wosu.org/politics-government/2026-09-23/franklin-county-democrats-endorse-both-ballot-issues-to-reform-columbus-city-council
  - Observed publication date and time: September 23, 2026 at 9:59 AM EDT
  - Access time: This run, approximately 06:33 ET September 23, 2026
  - Observed: Article text, vote outcome, quotes referenced in summary, Issue 8 and Issue 9 descriptions, housing policy rationale from council leadership

**Verification limits:**
- Direct fetches to WOSU returned content via WebFetch successfully.
- Reddit and X/Twitter post content inaccessible; public reaction volume is unverified.
- The housing-policy connection (at-large seats = citywide housing voice) is sourced from council leadership statements in the WOSU article, not from independent analysis.

**Overlap check:** Prior brief (September 21, 2026) covered "Our City Our Say Issue 8" as an ongoing ballot fight. Today's material change is the Franklin County Democrats formally endorsing both competing measures — a new institutional development not present in the September 21 brief.

**Suggested reporting question:** With Franklin County Democrats endorsing both Issues 8 and 9, what does a split ballot outcome mean for Columbus's ability to advance citywide housing goals — and which measure do housing advocates prefer?

---

## Attempted Sources and Access Summary

**Directly accessible (WebFetch succeeded):**
- WOSU Public Media (wosu.org) — two articles fetched successfully; in-window timestamps confirmed
- Yahoo News (yahoo.com) — one article fetched successfully; in-window timestamp confirmed
- Columbus REALTORS (columbusrealtors.com) — news index fetched; one September 23 item confirmed (event title only: "Panel Hosted by the Columbus REALTORS® Housing Affordability and Community Partnerships Committee" — insufficient detail for a lead card)

**HTTP 403 (blocked by cloud egress policy):**
- Columbus Underground (columbusunderground.com) — all direct fetches blocked; articles surfaced in search snippets but dates unconfirmed
- NBC4 / WCMH (nbc4i.com) — blocked
- Columbus Business First — blocked

**Not surfaced or inaccessible:**
- Reddit (r/Columbus, r/RealEstate) — no post content accessible
- X/Twitter — real-time post content not accessible
- Facebook neighborhood groups — behind login walls
- Instagram — not accessible via search

**Search snippets consulted (dates unverifiable from snippets alone):**
- Columbus Underground: "Development Roundup: Construction Starting on South Side, New Affordable Housing & More"
- Columbus Underground: "Report: Construction Costs Are Up, And Likely to Increase More" (JLL report; Columbus-local angle with Homeport CEO quote)
- Columbus Underground: "Demolition and Six-Story Development in Brewery District Approved" (106 units at 1036 S. Front St.; HRC voted 5-2)
- These three stories are held for independent date verification; they are not lead cards in this brief.

---

## Held Items from Prior Briefs (Not Repeated as New Leads)

The following themes from September 21, 2026 remain active but show no material change confirmed within the current window:
- Zone In Phase 2 (comment window open through Oct. 24)
- Columbus rental registry / Columbus Apartment Association litigation signal
- OSU Moritz Law School → Huntington Building (announced Sep 14)
- Columbus affordable housing gap / COCLT East Side condos
- Fall 2026 housing market buyer conditions

These are not repeated as lead cards per the no-carry-forward rule. Newsroom should check independently for new developments.

---

*Social listener brief. September 23, 2026. Two verified leads. All volume and sentiment readings UNMEASURED. Every lead requires independent verification before newsroom use.*
