#!/usr/bin/env node
// Export the live public content to content/snapshot/public-data.json.
//
// The snapshot is the site's last-known-good fallback: when the database
// is unreachable, public pages serve this file instead of rendering an
// empty site (the 2026-08-24 Neon quota outage blanked every page).
//
// Run whenever the database is healthy — the daily newsroom routine should
// run it after publishing:
//   DATABASE_URL=... node scripts/export-content-snapshot.mjs
//
// Safety: refuses to overwrite a non-empty snapshot with zero articles
// unless --force is passed, so a flaky read can never erase the fallback.

import { neon } from "@neondatabase/serverless";
import { marketSnapshotFingerprint } from "./market-snapshot-fingerprint.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(here, "..", "content", "snapshot", "public-data.json");
const force = process.argv.includes("--force");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("export-content-snapshot: DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(databaseUrl);

const [articles, ads, marketSnapshot, heroStats, neighborhoods, tickers, interviews, testimonials, settingsRows, marketObservations] =
  await Promise.all([
    sql`SELECT * FROM articles WHERE status = 'live' ORDER BY created_at DESC`,
    sql`SELECT * FROM ads WHERE status = 'live' ORDER BY created_at DESC`,
    sql`SELECT * FROM market_snapshot ORDER BY sort_order ASC`,
    sql`SELECT * FROM hero_stats ORDER BY sort_order ASC`,
    sql`SELECT * FROM neighborhoods ORDER BY sort_order ASC`,
    sql`SELECT * FROM ticker_items WHERE active = true ORDER BY sort_order ASC`,
    sql`SELECT * FROM interviews ORDER BY sort_order ASC`,
    sql`SELECT * FROM testimonials ORDER BY sort_order ASC`,
    sql`SELECT key, value FROM settings`,
    // Same shape and same filters as getLatestMarketObservations() so the
    // fallback serves exactly what the live query would have served.
    sql`
      SELECT DISTINCT ON (
        market_observations.metric_key,
        market_observations.geography_slug,
        market_observations.property_type
      )
        market_observations.id,
        market_observations.metric_key,
        market_observations.label,
        market_observations.value_display,
        market_observations.value_numeric,
        market_observations.unit,
        market_observations.geography_type,
        market_observations.geography_slug,
        market_observations.geography_label,
        market_observations.property_type,
        TO_CHAR(market_observations.period_start, 'YYYY-MM-DD') AS period_start,
        TO_CHAR(market_observations.period_end, 'YYYY-MM-DD') AS period_end,
        TO_CHAR(market_observations.as_of_date, 'YYYY-MM-DD') AS as_of_date,
        market_sources.name AS source_name,
        market_observations.source_url,
        COALESCE(market_observations.methodology_url, market_sources.methodology_url) AS methodology_url,
        market_observations.notes
      FROM market_observations
      JOIN market_sources ON market_sources.slug = market_observations.source_slug
      WHERE market_observations.quality_status = 'verified'
        AND market_sources.active = true
      ORDER BY
        market_observations.metric_key,
        market_observations.geography_slug,
        market_observations.property_type,
        market_observations.period_end DESC,
        market_observations.updated_at DESC
    `,
  ]);

if (articles.length === 0 && !force) {
  let existingCount = 0;
  try {
    existingCount = JSON.parse(readFileSync(snapshotPath, "utf8")).articles?.length ?? 0;
  } catch {
    existingCount = 0;
  }
  if (existingCount > 0) {
    console.error(
      `export-content-snapshot: DB returned 0 live articles but the existing snapshot has ${existingCount}. ` +
        "Refusing to overwrite the fallback. Pass --force only if the site really has zero live articles."
    );
    process.exit(1);
  }
}

const settings = {};
for (const row of settingsRows) settings[row.key] = row.value;

const snapshot = {
  _meta: {
    generated_at: new Date().toISOString(),
    market_fingerprint: "",
    note:
      "Last-known-good public content, served when the database is unreachable. " +
      "Refresh with: node scripts/export-content-snapshot.mjs (requires DATABASE_URL). " +
      "Never edit articles here by hand — this file only ever mirrors what was live in the database.",
  },
  articles,
  ads,
  marketSnapshot,
  heroStats,
  marketObservations,
  neighborhoods,
  tickers,
  interviews,
  testimonials,
  settings,
};

// Stamped after the payload exists; tests recompute it to catch a hand-edited
// fallback that no longer matches what the database exported.
snapshot._meta.market_fingerprint = marketSnapshotFingerprint(snapshot);

mkdirSync(dirname(snapshotPath), { recursive: true });
writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + "\n");
console.log(
  `Snapshot written to ${snapshotPath}: ${articles.length} articles, ${ads.length} ads, ` +
    `${neighborhoods.length} neighborhoods, ${marketObservations.length} market observations, ` +
    `${tickers.length} ticker items (market fingerprint ${snapshot._meta.market_fingerprint}).`
);
console.log("Commit the updated snapshot so the deployed site can use it as its outage fallback.");
