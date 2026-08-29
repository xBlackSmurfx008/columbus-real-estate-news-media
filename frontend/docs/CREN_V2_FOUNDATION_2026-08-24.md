# CREN Living Intelligence v2 — Foundation Handoff

Status: implemented, extended, and deployed on `feat/site-map` at `3fc9ba8`
Date: August 24, 2026 (America/New_York)

## Current status — August 28, 2026

The v2 foundation and the follow-on discovery tranche are live. Completed
follow-ons include the public site map, intent-aware search/resource results,
saved items, area-scoped housing search links, and Neon-backed member signup,
login, and profile persistence. Production uptime passes and all 87 live
images are reachable.

Production is not readiness-green yet. The market observation tables are still
missing, one live article lacks a canonical slug, six live images lack reserved
fingerprint/job records, and 13 live articles retain queued editorial statuses.

## Outcome

This branch establishes the first production foundation for turning Columbus Real Estate News into a source-led local housing and living publication. It does not increase automated story volume or copy unverified legacy market figures into the new data model.

Implemented:

- immutable article canonical slugs;
- historical headline redirect recovery, including pre-repair slugs encoded in newsroom article IDs;
- canonical article links across home, blog, area, topic, related-story, admin, and publishing paths;
- `robots.txt`, a complete XML sitemap, and a two-day Google News sitemap;
- route-specific titles, descriptions, and canonicals for the primary editorial surfaces;
- server-rendered `NewsArticle` and breadcrumb structured data;
- visible publisher, newsroom, editorial-standards, corrections, and automation disclosures;
- removal of unsupported audience/open-rate claims, stale header figures, fabricated fallback articles, and unverified hard-coded fallback metrics;
- source-aware market observations with geography, property type, period, as-of date, source URL, methodology URL, and quality status;
- a fail-closed market observation importer;
- area hubs organized into housing/rent, development/politics, and restaurants/events coverage;
- official reader research links for property records, school data, Columbus legislation, and current events;
- editorial-first primary navigation.

## Production deployment order

The application now selects `articles.canonical_slug`. Run the database migrations before deploying the application bundle.

1. Create a current Neon backup or branch.
2. Run the article routing migration:

   ```bash
   node --env-file=.env.local scripts/migrate-article-routing.mjs
   ```

3. Run the source-aware market data migration:

   ```bash
   node --env-file=.env.local scripts/migrate-market-observations.mjs
   ```

4. Export a new last-known-good public snapshot so it includes canonical slugs:

   ```bash
   node --env-file=.env.local scripts/export-content-snapshot.mjs
   ```

5. Run tests and a production build:

   ```bash
   npm run test:image-pipeline
   npm run build
   ```

6. Deploy a preview, verify the checklist below, then promote the same build to production.

The article-routing migration and member-profile migration are installed in
production. The source-aware market migration remains pending and must happen
before area hubs can leave pending-data mode.

## Preview verification

- `/robots.txt` returns 200 and lists both sitemaps.
- `/sitemap.xml` returns 200 and includes canonical article and area URLs.
- `/news-sitemap.xml` returns valid XML and includes only stories published in the previous two days.
- A current article URL returns 200 and includes one canonical tag.
- A repaired article's former headline URL permanently redirects to the canonical article.
- The article page contains `NewsArticle` JSON-LD, visible author/publisher identity, and source links in its body.
- `/newsroom`, `/editorial-standards`, and `/corrections` return 200.
- Home does not show the removed 10,000-reader, 58%-open-rate, stale mortgage-rate, or stale inventory claims.
- An area without verified market observations shows an honest pending-data state rather than legacy values.
- Article publication still completes automatically after the exact copy and unique durable image pass the existing gate.

## Loading market observations

Run the schema migration first. Import only verified JSON arrays:

```bash
node --env-file=.env.local scripts/import-market-observations.mjs path/to/verified-observations.json
```

Every row must include:

- `metric_key`, `label`, `value_display`, and optional numeric/unit fields;
- `geography_type`, `geography_slug`, and `geography_label`;
- `property_type` such as `single-family`, `apartment`, or `all-residential`;
- `period_end`, optional `period_start`, and `as_of_date` in `YYYY-MM-DD` format;
- a registered `source_slug` and direct HTTPS `source_url`;
- optional `methodology_url` and notes explaining caveats.

The importer rejects missing provenance, invalid or insecure URLs, incoherent periods, non-numeric numeric values, and unknown sources. It does not turn legacy dashboard rows into verified observations.

## Rollback

The application deployment can be rolled back independently after the Neon backup is created. The migrations are additive: they add canonical slugs, redirect history, source registry, and observation tables without deleting legacy columns or content. Do not drop the new tables during an application rollback; retaining them preserves URL history and imported provenance.

## Verification completed locally

- automated tests: 40 passed, 0 failed;
- Next.js production build: passed;
- generated routes include `/robots.txt`, `/sitemap.xml`, `/news-sitemap.xml`, `/newsroom`, `/editorial-standards`, and `/corrections`;
- `git diff --check`: passed.

Existing non-blocking warnings remain outside this branch's public-site scope: the Next.js middleware-to-proxy deprecation and dynamic filesystem tracing in `src/agent/store.ts`.
