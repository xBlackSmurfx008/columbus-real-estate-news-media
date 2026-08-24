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

const [articles, ads, marketSnapshot, heroStats, neighborhoods, tickers, interviews, testimonials, settingsRows] =
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
    note:
      "Last-known-good public content, served when the database is unreachable. " +
      "Refresh with: node scripts/export-content-snapshot.mjs (requires DATABASE_URL). " +
      "Never edit articles here by hand — this file only ever mirrors what was live in the database.",
  },
  articles,
  ads,
  marketSnapshot,
  heroStats,
  neighborhoods,
  tickers,
  interviews,
  testimonials,
  settings,
};

mkdirSync(dirname(snapshotPath), { recursive: true });
writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + "\n");
console.log(
  `Snapshot written to ${snapshotPath}: ${articles.length} articles, ${ads.length} ads, ` +
    `${neighborhoods.length} neighborhoods, ${tickers.length} ticker items.`
);
console.log("Commit the updated snapshot so the deployed site can use it as its outage fallback.");
