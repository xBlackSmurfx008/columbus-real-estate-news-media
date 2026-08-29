# Columbus Real Estate News CMO Growth Audit

Date: August 24, 2026
Scope: `columbusrealestatenews.com`, the production content/data system, competitive positioning, and the path toward
250,000 daily pageviews
Status: Strategy baseline reconciled with the deployed product; current implementation is on `feat/site-map` at `3fc9ba8`

## Current status — August 29, 2026

The first implementation tranche is complete: source-led editorial foundations,
area baseline pages, search/resource discovery, saved items, area-scoped housing
links, sitemap/navigation coverage, activation instrumentation, and
Neon-backed member profiles are deployed. Production uptime passes and the
public image audit reports 87/87 reachable live images.

The growth plan remains strategically open, not technically forgotten. The
source-aware market layer is installed with 20 verified observations across 11
geographies, but reference hubs are not yet fully reported, owned-audience
delivery is not implemented, and production still needs four near-duplicate
image replacements, six image-job reconciliations, and queued-review cleanup.
This audit's older 72-hub target is superseded by the current area plan's 86
declared hubs.

## Executive decision

CREN should become **the living-intelligence layer for every Columbus-area neighborhood**: one place where a renter,
buyer, homeowner, seller, or relocating household can understand what housing costs, what is changing, what daily life
offers, and which verified local decisions or events are coming next.

The opportunity is real. No reviewed competitor combines all four of these assets in one Columbus-specific product:

1. current housing and rent data with historical comparisons;
2. neighborhood-level local government and development reporting;
3. restaurants, openings, events, parks, transit, and recurring festivals;
4. a permanent, updateable page for each place rather than a stream of disconnected articles.

The site is not ready to scale traffic yet. Its most urgent constraints are indexation, unstable article URLs, unsupported
marketing claims, thin area pages, incomplete data provenance, and almost no owned audience. A visual redesign alone will
not solve those problems.

## What the audit found

### First-party baseline

| Measure | Current observed state |
|---|---:|
| Live articles | 81 |
| Articles created in the last 30 days | 42 |
| Declared area hubs | 72 |
| Area slugs represented by at least one live story | 29 |
| Area hubs with no dedicated live story | 43 |
| Development stories | 24 |
| Lifestyle stories | 21 |
| Rental Market stories | 2 |
| Schools-topic stories | 2 |
| First-party pageviews in the 30-day reporting window | 3 |
| Daily-rotating unique visitor hashes | 2 |
| Subscribers | 1 |
| Leads | 0 |

The traffic tracker was introduced recently, so the traffic row is not a long-term historical measurement. It is still
the only auditable first-party baseline currently available.

### Critical issues

#### P0 — discovery and URLs

- `/robots.txt` returns 404.
- `/sitemap.xml` returns 404.
- Area, topic, market-data, and article-index pages reuse the same sitewide title and description; most have no explicit
  canonical URL.
- Article URLs are generated from the current headline. Correcting a headline changes the path.
- Search results still show old, factually corrected CREN headlines, but those old URLs now return 404 instead of a 301
  redirect to the corrected article.
- The article list places every story on one page instead of using crawlable pagination and permanent archive pages.

These defects discard accumulated authority whenever an article is corrected and make it harder for Google News and
Search to discover the corpus.

#### P0 — trust

- The homepage says “Join 10,000+ Columbus locals” and “58% open rate,” while the production database contains one
  subscriber and no evidence supporting the open-rate claim.
- Market figures are hard-coded in the site header and additional fallback modules. They can disagree with the current
  database snapshot or appear without an as-of date.
- The market tables do not store a source URL, release date, geography, property type, observation period, or method per
  metric. “Sources: Columbus REALTORS, Redfin, Freddie Mac” is not enough to reproduce a number.
- Generic newsroom bylines are represented as a `Person` in article schema and have no author/profile page.
- The About page does not yet provide the full publisher, ownership, corrections, sourcing, and automation transparency
  expected of a serious news organization.

#### P1 — content and product depth

- Only 29 of 72 area slugs have any dedicated story; most area pages repeat a generic description and show metro stories.
- Only 14 areas have a market row. A hub without data, useful local context, or a dedicated story is a doorway to an empty
  room.
- Coverage is concentrated in Development and Lifestyle. Rental Market and Schools each have only two stories.
- The site does not separate apartment rent from single-family-home rent, bedroom count, asking rent from effective rent,
  or city/ZIP/neighborhood/metro geography.
- It has no historical charts, revisions, downloadable data, side-of-town landing pages, event calendar, annual festival
  pages, restaurant/opening tracker, meeting calendar, or “what changed this month” neighborhood digest.
- Related stories are simply the latest five other articles, not stories matched by place, topic, entity, or reader task.
- Dates are stored as free-form text, resulting in inconsistent display formats and unreliable date-based sorting.

#### P1 — experience and performance

A local mobile Lighthouse run produced:

| Category | Score |
|---|---:|
| Performance | 88 |
| Accessibility | 96 |
| Best practices | 96 |
| SEO checklist | 100 |

The homepage's lab metrics were 2.6-second LCP, 370 ms total blocking time, and zero layout shift. The SEO checklist score
does not detect the strategic absence of a sitemap or duplicated page metadata. Other defects include a missing favicon,
low-contrast navigation/footer text, and an unusually long home/article feed.

## Define the 250,000 target correctly

“Hits” is not a useful growth KPI. CREN should use these definitions:

- **Pageview:** one rendered content page.
- **Visit/session:** a group of pageviews in one browsing session.
- **Daily user:** a deduplicated person/device estimate, measured with a privacy-preserving method.
- **Engaged visit:** a visit that reads, scrolls, saves, subscribes, follows an area, or opens a second page.

The recommended north-star target is **250,000 pageviews per day**, equal to approximately 7.5 million monthly pageviews.
At two pages per visit, that would require roughly 3.75 million monthly visits. If the intended target is 250,000 visits
per day, it means 7.5 million monthly visits and should be treated as a materially larger objective.

For scale, Similarweb's public July 2026 estimates show approximately:

| Publisher | Estimated traffic | What its scale demonstrates |
|---|---:|---|
| Dispatch.com | 4.0M visits | A major Columbus news brand; organic search is its largest desktop channel |
| Cleveland.com | 11.1M visits | The target range requires a full regional publisher, not a single-topic blog |
| NOLA.com | 4.8M visits | Strong direct habit and broad recurring local coverage |
| Axios.com | 20.9M visits | Newsletter-led habit at national, multi-city scale; not a Columbus-only comparison |

Third-party traffic estimates are directional, not audited analytics. The content and acquisition patterns are more
valuable than pretending the figures are exact.

## Competitive analysis

### Columbus Dispatch — breadth and search inventory

What works:

- permanent sections spanning local news, politics, business, sports, entertainment, service information, and archives;
- a deep keyword footprint created over years;
- repeat readership in addition to search;
- reporting capacity for breaking news and public records.

What CREN should emulate:

- permanent sections, beat ownership, searchable archives, frequent updates, and public-record reporting;
- coverage that follows a project from proposal through approval, construction, opening, and later outcomes.

What CREN can improve on:

- make the real-estate consequence and place-level history clearer;
- offer cleaner data methodology, neighborhood subscriptions, and less clutter.

### Cleveland.com and NOLA.com — the scale benchmark

What works:

- tens of thousands of ranking keywords;
- direct traffic built through long-running habit, recognizable beats, and broad daily utility;
- sports, weather, politics, food, culture, and breaking news widen the audience beyond one transaction moment;
- multiple stories per day and a large evergreen archive.

CREN should not imitate their entire general-news scope. It should build enough daily-life utility to earn repeat visits
while retaining a defensible housing-and-place focus.

### Axios Columbus — concise local habit

What works:

- scannable answer-first structure;
- a recurring newsletter habit;
- clear “what's happening / why it matters / what's next” framing;
- a useful blend of politics, development, restaurants, and civic life.

CREN's current writing standard already contains much of this discipline. Its advantage should be deeper source links,
historical data, and a permanent neighborhood record attached to every news item.

### 614NOW — high-frequency discovery and participation

What works:

- explicit Food & Drink subcategories for openings, closings, coming soon, and recommendations;
- annual festival and event guides;
- daily email promotion;
- trending modules, polls, contests, and event submission;
- high publishing frequency and socially shareable subjects.

What not to emulate:

- curiosity-gap headlines that withhold the location or answer;
- stories based only on promotional announcements;
- volume that outruns verification.

CREN can win by answering the location and property/living consequence immediately, then attaching the story to a durable
area page.

### Columbus Navigator — owned audience and evergreen guides

What works:

- a clear “Know Columbus better than anyone” promise;
- a claimed 12,000-reader daily newsletter;
- permanent guides for restaurants, brunch, openings, and things to do;
- daily utility rather than a weekly transaction-only relationship.

CREN should emulate the simple newsletter promise and evergreen guide layer, but add sourced housing costs and public
records that Columbus Navigator does not make its core product.

### What Now Columbus — openings intelligence

What works:

- Restaurants, Retail, and Real Estate as permanent verticals;
- reporting on planned openings months before launch;
- a repeatable pipeline sourced from permits, owners, franchises, and development activity;
- business-owner participation and tip generation.

CREN should build an openings tracker that distinguishes rumor, permit, lease, construction, announced opening, verified
opening, and closure. Every status must include its evidence date.

### Experience Columbus — event taxonomy

What works:

- Events Today, This Weekend, Festivals & Annual Events, Concerts, Sports, Performing Arts, and Family Events;
- event submission;
- neighborhood-specific restaurants and things-to-do pages;
- permanent annual-event URLs that are refreshed instead of discarded.

CREN should not try to reproduce the entire visitor bureau. It should explain events as resident utility: dates, street
closures, parking/transit, expected recurring schedule, nearby businesses, and links to the relevant neighborhood page.

### Redfin and RentCafe — reusable data products

Redfin combines current figures with one-, three-, and five-year charts, comparisons, sale-to-list behavior, schools,
environmental risk, walk/transit/bike context, and links to ZIP and neighborhood markets. RentCafe labels its update date
and sources, separates property types and bedroom counts, and allows neighborhood comparisons.

CREN's opportunity is not to copy listing inventory. It is to combine properly licensed/open data with Columbus-specific
interpretation, public decisions, restaurant/event context, and a transparent local source ledger.

## Brand and product strategy

### Positioning

**Columbus Real Estate News helps you understand the cost, change, and daily life of every Columbus-area neighborhood.**

This is broader and more useful than “real-estate articles,” but narrower and more defensible than a general Columbus
newsroom.

### Core reader questions

Every area hub should answer:

1. What does it cost to buy here now, and how has that changed over 1, 3, 5, and 10 years?
2. What does it cost to rent an apartment versus a house, by bedroom count?
3. How quickly are homes renting or selling, and how much inventory exists?
4. What new housing, retail, restaurant, transit, school, park, and infrastructure projects are changing the area?
5. What local-government decisions, taxes, levies, zoning cases, and meetings should residents watch?
6. What can residents do this week, this month, and every year?
7. What is the measurement's source, geography, period, method, and limitation?

### Side-of-town structure

Create five broad discovery pages that lead to precise municipal and neighborhood hubs:

- Central / Downtown;
- North / Northeast;
- East / Southeast;
- South;
- West / Northwest.

The grouping must be defined in a geographic registry rather than improvised in article copy. A place can retain its
exact city, neighborhood, ZIP, school district, and county relationships while appearing in a broader side-of-town page.

### Recommended navigation

- News
- Neighborhoods
- Market Data
- Rent
- Buy & Sell
- Development & Politics
- Food & Openings
- Events
- Guides

Commercial service funnels should remain present but secondary to the reader promise. Editorial pages must not appear to
be disguised lead-generation pages.

## The neighborhood hub product

Each of the 72 hubs should use the same reliable information architecture while retaining specific local reporting:

1. one-sentence area answer and map boundary;
2. housing snapshot with `as of`, geography, and source;
3. sale price, price per square foot, sales, inventory, days on market, and sale-to-list trend charts;
4. apartment rent and house rent separated by bedroom count and property type;
5. renter cost calculator and rent-versus-buy scenario with disclosed assumptions;
6. latest local reporting and an update timeline;
7. active development, zoning, permits, and public-spending tracker;
8. local politics, public meetings, levies, and school-boundary changes;
9. restaurants and retail: new, coming soon, closed, and established guides;
10. events this week plus permanent annual festivals and recurring activities;
11. parks, libraries, transit, bike/walk access, groceries, and healthcare access;
12. methodology, corrections, limitations, and downloadable/source data;
13. “Follow this area” email alert.

Use objective, consistently presented source data. Avoid subjective “good,” “safe,” “family,” or demographic-coded
ranking language. Current HUD guidance permits consistent, unbiased school and crime data, but the product should provide
the underlying measure and source rather than steering readers with CREN opinions.

## Data platform requirements

Replace formatted text fields with an observation model. A market observation should minimally contain:

- `geography_id` and boundary version;
- `metric_key`;
- property type and bedroom count where applicable;
- numeric value and unit;
- observation start/end period;
- release date and fetched date;
- source ID, source URL, and source document date;
- methodology/version;
- original value, later revisions, and limitation notes.

### Preferred data hierarchy

1. Licensed MLS/RESO data for sale-market depth when a valid agreement exists.
2. Franklin County Auditor and Recorder for parcels, transfers, valuations, and deeds.
3. City legislation, zoning, permits, GIS, budgets, and meeting records.
4. Census ACS and HUD for tenure, housing stock, gross rent, household cost, and affordability baselines.
5. Freddie Mac for mortgage rates.
6. MORPC and COTA for population, transportation, projects, and GTFS transit data.
7. Properly licensed rental/listing datasets for current apartment and single-family asking rents.
8. Independent reporting and direct interviews for context.

Do not scrape a portal merely because a number is visible. Store license terms and permitted display/retention behavior in
the source registry.

## Editorial portfolio

### Durable products

- monthly Columbus and side-of-town market reports;
- monthly market page for each priority neighborhood, expanding to all 72;
- “Apartment rent vs. house rent” pages by area;
- annual property-tax and reassessment explainers;
- development and affordable-housing pipeline trackers;
- restaurant/opening/closure tracker;
- local election, levy, zoning, and city-budget guides;
- “things to do this weekend” and monthly calendars;
- one permanent page per annual festival/event, updated each year;
- first-time renter, buyer, seller, landlord, and relocating-household guides;
- ZIP, municipality, neighborhood, school-district, and side-of-town comparison tools.

### News cadence after the foundation is fixed

- two to four verified local news briefs per weekday;
- one useful daily food/opening/event item when evidence exists;
- one side-of-town weekly digest;
- one major data analysis per week;
- monthly refreshes for priority area dashboards;
- immediate status updates to tracker pages when a proposal, vote, permit, construction start, opening, or closure changes.

Automation remains fail closed. If the source record cannot support the article, the system should publish nothing rather
than filling a quota. Scaling requires more source monitors and structured updates, not weaker evidence.

## Search and technical growth program

### First 14 days

1. Add immutable canonical article slugs.
2. Add a redirect-history table and permanent 301 redirects from every prior title-derived URL.
3. Publish `robots.txt`, a sitemap index, article sitemap, area/topic sitemaps, and a rolling news sitemap.
4. Add unique metadata and canonical URLs to home, blog, market, area, topic, event, and guide pages.
5. Change article markup from generic `BlogPosting` to the appropriate `NewsArticle`; add publisher logo, correct author
   type, author URL, image variants, and date fields.
6. Create publisher, author/newsroom, editorial standards, sourcing, corrections, ownership, and AI-use pages.
7. Remove unsupported subscriber/open-rate claims and all stale hard-coded market figures.
8. Give each metric a visible source link and as-of date.
9. Add a favicon and correct contrast failures.
10. Connect and verify Google Search Console, Bing Webmaster Tools, Google News performance, and production analytics.

Google automatically considers eligible publishers for Google News; there is no application shortcut. Crawlability,
permanent URLs, transparent authorship, useful original reporting, and policy compliance are the foundation.

### 30–90 days

- launch the five side-of-town pages and the first 20 complete area hubs;
- implement HTML pagination, year/month archives, and topical/area internal links;
- replace “latest five” recommendations with entity/place/topic similarity;
- publish the first data charts, comparison tool, events calendar, restaurant tracker, and public-meeting calendar;
- add “submit a tip,” “submit an event,” and “report an opening/closure” workflows;
- launch a daily email with area and topic preferences;
- add Web Analytics/Core Web Vitals monitoring and a source-to-subscription dashboard.

### 3–12 months

- complete all 72 area hubs based on usefulness gates, not thin page count;
- build ZIP and school-district crosswalks;
- create permanent annual event pages and seasonal guides;
- add downloadable data and revision history;
- establish syndication/referral partnerships with neighborhood associations, civic groups, libraries, employers,
  universities, and compliant news/discovery platforms;
- use short-form video and social posts to distribute original CREN reporting, always linking to the permanent hub.

## Owned-audience and distribution plan

### Newsletter

Replace the unsupported social proof with a concrete promise:

> Columbus Living Brief — what housing costs, what opened, what changed at City Hall, and what to do this week.

Offer daily and weekly frequency, plus area/topic preferences. Measure verified subscribers, delivery, unique opens,
clicks, return visits, and unsubscribes. Never show a count or open rate that the delivery provider cannot verify.

### Distribution channels

- Google Search and Google News;
- direct/email and browser alerts;
- Facebook and Instagram for openings, events, and housing visuals;
- YouTube/TikTok/Reels for neighborhood explainers and data stories;
- Reddit and Nextdoor through genuine participation, not link dumping;
- local-government, association, library, university, employer, and relocation referrals;
- embeddable data cards with attribution links;
- journalist outreach for original CREN datasets and public-record findings.

The desired long-run traffic mix is diversified:

| Channel | Daily pageview contribution at maturity |
|---|---:|
| Evergreen search and area/data pages | 100,000 |
| Timely news, Google News, and Discover | 60,000 |
| Direct, newsletter, and alerts | 35,000 |
| Social, video, Reddit, and Nextdoor | 30,000 |
| Referrals and partnerships | 15,000 |
| Tools, embeds, maps, and saved alerts | 10,000 |
| **Total** | **250,000** |

This is a portfolio model, not a forecast. It prevents CREN from depending on one platform.

## Milestone gates

These are decision gates, not guaranteed forecasts:

| Horizon | Pageview gate | Product/quality gate |
|---|---:|---|
| 30 days | 250/day | indexation repaired; unsupported claims removed; reliable analytics live |
| 90 days | 1,000/day | 20 complete hubs; events/openings/data MVP; 500 verified email readers |
| 6 months | 5,000/day | 40 complete hubs; repeatable daily briefing; 2,500 verified email readers |
| 12 months | 25,000/day | 72 useful hubs; durable charts/trackers; 10,000 verified email readers |
| 18 months | 75,000/day | meaningful direct traffic, backlinks, syndication, and return habit |
| 24 months | 125,000/day | Columbus category leadership across housing and living-intelligence queries |
| 30–36 months | 250,000/day | only if search, direct, news, and distribution channels all meet their gates |

Do not advance the publishing-volume target when correction rate, source failures, stale metrics, duplicate imagery, or
reader dissatisfaction rise.

## KPI scorecard

### Audience

- pageviews, visits, daily/monthly users, engaged visits, pages per visit;
- new versus returning visitors;
- traffic and conversion by source, area, topic, format, and publication cohort;
- indexed pages, impressions, clicks, average position, Google News traffic, and backlinks.

### Product

- complete area hubs / 72;
- percentage of metrics current within SLA;
- number of readers following an area/topic;
- event saves, comparison uses, chart interactions, and second-page rate;
- Core Web Vitals by template.

### Editorial trust

- source depth and primary-source rate;
- corrections, withdrawals, duplicate images, failed publication gates, and stale stories;
- time from public-record change to verified tracker update;
- percentage of claims with reader-visible source links;
- unsupported marketing claims: zero.

### Owned audience and revenue

- verified subscribers and net weekly growth;
- delivery, click, and return-visit rates;
- sponsor renewal, ad viewability, and revenue per thousand pageviews;
- lead conversions reported separately from editorial engagement.

## Recommended first implementation sprint — reconciled

The first build should not be a broad visual overhaul. It should complete this sequence:

1. stable slugs and redirect recovery — implemented in code and mostly migrated; one live canonical-slug gap remains;
2. robots, sitemap, news sitemap, canonical metadata, and corrected structured data — implemented;
3. removal of unsupported proof and hard-coded market statistics — implemented;
4. normalized market observation/source schema — implemented, migrated, and populated with verified public-series rows;
5. production analytics plus Search Console baseline — activation analytics is live; Search Console verification remains open;
6. one complete reference hub—recommended German Village or Dublin—containing market history, apartment-versus-house
   rents, local politics/development, restaurants, events, transit/parks, sourcing, and follow-area conversion;
7. redesign the home, area, article, market, events, and tracker templates around that working data product — partial baseline shipped;
8. replicate only after the reference hub passes accuracy, speed, accessibility, engagement, and indexation checks — open.

## Sources consulted

- [CREN production site](https://columbusrealestatenews.com/)
- [CREN market data](https://columbusrealestatenews.com/market-data)
- [Google News policies and transparency requirements](https://support.google.com/news/publisher-center/answer/6204050)
- [Google News discovery guidance](https://support.google.com/news/publisher-center/answer/9606634)
- [Google News technical and permanent-URL guidance](https://support.google.com/news/publisher-center/answer/9606708)
- [Google Article structured-data guidance](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google page-experience guidance](https://developers.google.com/search/docs/appearance/page-experience)
- [Similarweb public Dispatch estimate](https://www.similarweb.com/website/dispatch.com/)
- [Similarweb public Cleveland.com estimate](https://www.similarweb.com/website/cleveland.com/)
- [Similarweb public NOLA estimate](https://www.similarweb.com/website/nola.com/)
- [Similarweb public Axios estimate](https://www.similarweb.com/website/axios.com/)
- [614NOW](https://614now.com/)
- [Columbus Navigator](https://www.columbusnavigator.com/)
- [What Now Columbus](https://whatnow.com/columbus/)
- [Experience Columbus events](https://www.experiencecolumbus.com/events/)
- [RentCafe Columbus rental trends](https://www.rentcafe.com/average-rent-market-trends/us/oh/columbus/)
- [Redfin Columbus housing-market page](https://www.redfin.com/city/4664/OH/Columbus/housing-market)
- [HUD Fair Housing Act overview](https://www.hud.gov/helping-americans/fair-housing-act-overview)
- [HUD 2026 clarification on consistently shared school and crime information](https://www.hud.gov/news/hud-no-26-028)
- [U.S. Census QuickFacts for Columbus](https://www.census.gov/quickfacts/fact/table/columbuscityohio/POP010220)
