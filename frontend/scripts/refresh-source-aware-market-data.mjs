#!/usr/bin/env node
// Fetches public Zillow and Freddie Mac series into the source-aware market layer.
// Dry-run is the default; use --write only after reviewing the fetched summary.

import { neon } from "@neondatabase/serverless";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateMarketObservation } from "./market-observation-lib.mjs";
import {
  FRED_FEED,
  ZILLOW_FEEDS,
  buildMortgageObservation,
  buildZillowObservations,
  getCityAreas,
  getNeighborhoodAreas,
} from "./source-aware-market-data-lib.mjs";

const write = process.argv.includes("--write");
const databaseUrl = process.env.DATABASE_URL;
const asOfDate = new Date().toISOString().slice(0, 10);

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.text();
}

async function collect() {
  const observations = [];
  const feeds = [
    ["zhviCity", { metricKey: "typical-home-value", label: "Typical home value", propertyType: "all-residential", methodologyUrl: "https://www.zillow.com/research/tag/zillow-home-value-index/", notes: "Zillow ZHVI is a modeled typical home value, not a median sale price." }, getCityAreas(), "city"],
    ["zhviNeighborhood", { metricKey: "typical-home-value", label: "Typical home value", propertyType: "all-residential", methodologyUrl: "https://www.zillow.com/research/tag/zillow-home-value-index/", notes: "Zillow ZHVI is a modeled typical home value, not a median sale price." }, getNeighborhoodAreas(), "neighborhood"],
    ["zoriCity", { metricKey: "observed-rent", label: "Observed rent index", propertyType: "all-rental", methodologyUrl: "https://www.zillow.com/research/data/", notes: "Zillow ZORI is a modeled observed rent index, not a guaranteed asking-rent quote. Zillow's public ZORI file is available at the city geography level here." }, getCityAreas(), "city"],
  ];

  for (const [feedName, config, areas, geographyType] of feeds) {
    const text = await fetchText(ZILLOW_FEEDS[feedName]);
    observations.push(...buildZillowObservations(text, { ...config, sourceUrl: ZILLOW_FEEDS[feedName] }, asOfDate, areas, geographyType));
  }

  const mortgage = buildMortgageObservation(await fetchText(FRED_FEED), asOfDate);
  if (mortgage) observations.push(mortgage);
  return observations;
}

const observations = await collect();
const validationErrors = observations.flatMap((observation, index) =>
  validateMarketObservation(observation).map((error) => `row ${index}: ${error}`));
if (validationErrors.length > 0) {
  console.error(`Market refresh blocked:\n${validationErrors.join("\n")}`);
  process.exit(1);
}

if (write) {
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  const sql = neon(databaseUrl);
  const sourceRows = await sql`SELECT slug FROM market_sources WHERE active = true`;
  const activeSources = new Set(sourceRows.map((source) => source.slug));
  const unknownSources = [...new Set(observations.map((observation) => observation.source_slug).filter((source) => !activeSources.has(source)))];
  if (unknownSources.length > 0) {
    console.error(`Unknown or inactive source_slug: ${unknownSources.join(", ")}`);
    process.exit(1);
  }

  for (const observation of observations) {
    await sql`
      INSERT INTO market_observations (
        metric_key, label, value_display, value_numeric, unit,
        geography_type, geography_slug, geography_label, property_type,
        period_start, period_end, as_of_date, source_slug, source_url,
        methodology_url, notes, quality_status, updated_at
      ) VALUES (
        ${observation.metric_key}, ${observation.label}, ${observation.value_display},
        ${observation.value_numeric}, ${observation.unit}, ${observation.geography_type},
        ${observation.geography_slug}, ${observation.geography_label}, ${observation.property_type},
        ${observation.period_start}, ${observation.period_end}, ${observation.as_of_date},
        ${observation.source_slug}, ${observation.source_url}, ${observation.methodology_url},
        ${observation.notes}, 'verified', NOW()
      )
      ON CONFLICT (metric_key, geography_slug, property_type, period_end, source_slug)
      DO UPDATE SET
        label = EXCLUDED.label, value_display = EXCLUDED.value_display,
        value_numeric = EXCLUDED.value_numeric, unit = EXCLUDED.unit,
        geography_type = EXCLUDED.geography_type, geography_label = EXCLUDED.geography_label,
        period_start = EXCLUDED.period_start, as_of_date = EXCLUDED.as_of_date,
        source_url = EXCLUDED.source_url, methodology_url = EXCLUDED.methodology_url,
        notes = EXCLUDED.notes, quality_status = 'verified', updated_at = NOW()
    `;
  }
}

const byMetric = observations.reduce((groups, observation) => {
  groups[observation.metric_key] ??= [];
  groups[observation.metric_key].push(observation);
  return groups;
}, {});
console.log(JSON.stringify({ write, asOfDate, observations: observations.length, byMetric, areas: [...new Set(observations.map((observation) => observation.geography_slug))].length }, null, 2));

if (write) await reexportSnapshot();

/**
 * Re-export the committed outage fallback so it can never drift behind the
 * database again. This is the fix for the 2026-09-04 inconsistency: the Aug
 * 28-30 refreshes updated the DB but nobody re-exported the snapshot, so any
 * surface serving the fallback reported a different YoY and mortgage rate.
 * Skipped with --no-snapshot only when a caller re-exports itself.
 */
async function reexportSnapshot() {
  if (process.argv.includes("--no-snapshot")) {
    console.log("snapshot re-export skipped (--no-snapshot)");
    return;
  }
  const script = join(dirname(fileURLToPath(import.meta.url)), "export-content-snapshot.mjs");
  console.log("re-exporting content/snapshot/public-data.json ...");
  const result = spawnSync(process.execPath, [script], { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    console.error("snapshot re-export FAILED — commit no market change until the fallback matches the database.");
    process.exit(result.status ?? 1);
  }
  console.log("Commit the refreshed snapshot alongside this market update.");
}
