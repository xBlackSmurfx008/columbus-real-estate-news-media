#!/usr/bin/env node
// Per-area performance report (owner plan 2026-09-04, P1 item 8).
//
// Answers the owner's measurement question for the flagship hub programme:
// organic entrances, email follows, and leads BY AREA, so the investment in a
// small set of deep hubs can be judged against the ~70 shallow ones.
//
// It reuses what already shipped rather than inventing a parallel scheme:
//   page_views          organic entrances (hub pages and area articles)
//   activation_events   area follows and saved preferences
//   funnel_events       funnel views, CTA clicks, form submissions by area
//   leads               leads and qualified leads by area
//
// Test traffic is excluded with the SHARED predicate in test-traffic-lib.mjs,
// the same rule kpi-report.mjs applies. scripts/kpi-report.mjs is owned
// elsewhere and is deliberately not modified by this work.
//
// Usage: DATABASE_URL=... node scripts/area-performance-report.mjs [--window 30]

import { neon } from "@neondatabase/serverless";
import { resolveTestTrafficPredicates } from "./test-traffic-lib.mjs";
import { buildAreaPerformance, areaSlugFromHubPath } from "../lib/area-performance.ts";
import { FLAGSHIP_AREA_SLUGS } from "../lib/flagship-areas.ts";
import { franklinSeedsToAreas } from "../lib/franklin-areas.ts";

const args = process.argv.slice(2);
const windowIndex = args.indexOf("--window");
const windowDays = windowIndex >= 0 ? Number(args[windowIndex + 1]) || 30 : 30;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

const directory = franklinSeedsToAreas().map((area) => ({ slug: area.slug, name: area.name }));

async function safeQuery(label, text, params) {
  try {
    return await sql.query(text, params);
  } catch {
    console.log(`- ${label}: unavailable (table missing or not migrated)`);
    return [];
  }
}

const [funnelPredicates, leadPredicates] = await Promise.all([
  resolveTestTrafficPredicates(sql, "funnel_events").catch(() => ({ realWhere: "true" })),
  resolveTestTrafficPredicates(sql, "leads").catch(() => ({ realWhere: "true" })),
]);

const hubViewRows = await safeQuery(
  "Hub page views",
  `SELECT path, referrer_host,
          COUNT(*)::int AS views,
          COUNT(DISTINCT visitor_hash)::int AS visitors
     FROM page_views
    WHERE created_at >= NOW() - ($1 || ' days')::interval
      AND path LIKE '/areas/%'
    GROUP BY path, referrer_host`,
  [windowDays],
);

const articleViewRows = await safeQuery(
  "Area article page views",
  `SELECT a.area_slug, pv.referrer_host,
          COUNT(*)::int AS views,
          COUNT(DISTINCT pv.visitor_hash)::int AS visitors
     FROM page_views pv
     JOIN articles a ON a.canonical_slug = pv.article_id
    WHERE pv.created_at >= NOW() - ($1 || ' days')::interval
      AND pv.article_id IS NOT NULL
      AND a.area_slug IS NOT NULL
    GROUP BY a.area_slug, pv.referrer_host`,
  [windowDays],
);

// Same area resolution the KPI report uses: payload slug, then hub path, then
// the `<slug>-area-hub` source convention the follow form writes.
const activationRows = await safeQuery(
  "Activation events",
  `SELECT COALESCE(
            NULLIF(payload->>'area_slug', ''),
            NULLIF(regexp_replace(path, '^/areas/([^/]+)/?$', '\\1'), path),
            NULLIF(regexp_replace(COALESCE(payload->>'method', payload->>'source', ''), '-area-hub$', ''), '')
          ) AS area_slug,
          COUNT(*) FILTER (WHERE event_name = 'area_follow_start')::int AS follows,
          COUNT(*) FILTER (WHERE event_name = 'preference_saved')::int AS preferences
     FROM activation_events
    WHERE created_at >= NOW() - ($1 || ' days')::interval
      AND (
        path LIKE '/areas/%'
        OR payload ? 'area_slug'
        OR COALESCE(payload->>'method', payload->>'source', '') LIKE '%-area-hub'
      )
    GROUP BY area_slug`,
  [windowDays],
);

const funnelRows = await safeQuery(
  "Funnel events",
  `SELECT area, stage, COUNT(*)::int AS events
     FROM funnel_events
    WHERE created_at >= NOW() - ($1 || ' days')::interval
      AND COALESCE(area, '') <> ''
      AND ${funnelPredicates.realWhere}
    GROUP BY area, stage`,
  [windowDays],
);

const leadRows = await safeQuery(
  "Leads",
  `SELECT area, status, COUNT(*)::int AS leads
     FROM leads
    WHERE created_at >= NOW() - ($1 || ' days')::interval
      AND COALESCE(area, '') <> ''
      AND ${leadPredicates.realWhere}
    GROUP BY area, status`,
  [windowDays],
);

const entrances = [
  ...hubViewRows
    .map((row) => ({
      areaSlug: areaSlugFromHubPath(row.path),
      surface: "hub",
      referrerHost: row.referrer_host,
      views: row.views,
      visitors: row.visitors,
    }))
    .filter((row) => row.areaSlug),
  ...articleViewRows.map((row) => ({
    areaSlug: row.area_slug,
    surface: "article",
    referrerHost: row.referrer_host,
    views: row.views,
    visitors: row.visitors,
  })),
];

const summary = buildAreaPerformance({
  directory,
  entrances,
  activation: activationRows.map((row) => ({
    areaSlug: row.area_slug,
    follows: row.follows,
    preferencesSaved: row.preferences,
  })),
  funnel: funnelRows.map((row) => ({ area: row.area, stage: row.stage, events: row.events })),
  leads: leadRows.map((row) => ({ area: row.area, status: row.status, leads: row.leads })),
  flagshipSlugs: FLAGSHIP_AREA_SLUGS,
});

const pct = (value) => (value === null ? "n/a" : `${value}%`);

console.log(`\n# CREN per-area performance — last ${windowDays} days\n`);
console.log(
  `Flagship hubs: ${summary.flagship.areas} of ${FLAGSHIP_AREA_SLUGS.length} declared appear in the data. ` +
    `Areas with any measured activity: ${summary.totals.areas}.`,
);
console.log(
  `Totals: ${summary.totals.organicEntrances} organic entrances, ${summary.totals.follows} follows, ${summary.totals.leads} leads.`,
);
console.log(
  `Flagship share of organic entrances: ${pct(summary.flagship.shareOfOrganicEntrances)} ` +
    `(${summary.flagship.organicEntrances} entrances, ${summary.flagship.follows} follows, ${summary.flagship.leads} leads).`,
);

if (summary.rows.length === 0) {
  console.log(`\nNo area-attributable activity in this window.`);
  process.exit(0);
}

console.log(`\n| Area | Flagship | Organic entrances | Hub views | Article views | Follows | Funnel views | CTA clicks | Submits | Leads | Qualified |`);
console.log(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
for (const row of summary.rows) {
  console.log(
    `| ${row.areaName} | ${row.isFlagship ? "yes" : ""} | ${row.organicEntrances} | ${row.hubViews} | ` +
      `${row.articleViews} | ${row.follows} | ${row.funnelViews} | ${row.ctaClicks} | ${row.formSubmits} | ` +
      `${row.leads} | ${row.qualifiedLeads} |`,
  );
}

const missing = FLAGSHIP_AREA_SLUGS.filter((slug) => !summary.rows.some((row) => row.areaSlug === slug));
if (missing.length > 0) {
  console.log(`\nFlagship hubs with no measured activity in this window: ${missing.join(", ")}.`);
}
console.log(
  `\nOrganic entrances count page views whose referrer host is a search engine. A missing referrer is direct or unknown, never organic.`,
);
