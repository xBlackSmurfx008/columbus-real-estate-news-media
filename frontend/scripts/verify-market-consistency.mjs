#!/usr/bin/env node
// Live consistency check: does the database agree with the committed outage
// fallback, and does any legacy copy still contradict the canonical set?
//
// The build-time gate (tests/market-data-consistency.test.mjs) can only see the
// committed snapshot. This script is the database-facing half — run it in the
// daily newsroom routine after any market refresh:
//   DATABASE_URL=... npm run verify:market-consistency
//
// Exits non-zero on any drift, so it can gate a routine the way the test gates
// the build. It never writes anything.

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMarketDataSet, normalizeMetricValue } from "../lib/market-data-core.ts";
import { marketSnapshotFingerprint } from "./market-snapshot-fingerprint.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(here, "..", "content", "snapshot", "public-data.json");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("verify-market-consistency: DATABASE_URL is not set.");
  process.exit(1);
}
const sql = neon(databaseUrl);

const [snapshotCards, heroStats, observations] = await Promise.all([
  sql`SELECT * FROM market_snapshot ORDER BY sort_order ASC`,
  sql`SELECT * FROM hero_stats ORDER BY sort_order ASC`,
  sql`
    SELECT DISTINCT ON (
      market_observations.metric_key,
      market_observations.geography_slug,
      market_observations.property_type
    )
      market_observations.id, market_observations.metric_key, market_observations.label,
      market_observations.value_display, market_observations.value_numeric, market_observations.unit,
      market_observations.geography_type, market_observations.geography_slug, market_observations.geography_label,
      market_observations.property_type,
      TO_CHAR(market_observations.period_start, 'YYYY-MM-DD') AS period_start,
      TO_CHAR(market_observations.period_end, 'YYYY-MM-DD') AS period_end,
      TO_CHAR(market_observations.as_of_date, 'YYYY-MM-DD') AS as_of_date,
      market_sources.name AS source_name, market_observations.source_url,
      COALESCE(market_observations.methodology_url, market_sources.methodology_url) AS methodology_url,
      market_observations.notes
    FROM market_observations
    JOIN market_sources ON market_sources.slug = market_observations.source_slug
    WHERE market_observations.quality_status = 'verified' AND market_sources.active = true
    ORDER BY market_observations.metric_key, market_observations.geography_slug,
             market_observations.property_type, market_observations.period_end DESC,
             market_observations.updated_at DESC
  `,
]);

const live = buildMarketDataSet({ observations, snapshotCards });

const problems = [];

for (const conflict of live.conflicts) {
  problems.push(
    `DB conflict: ${conflict.metricKey} @ ${conflict.geographySlug} — ` +
      conflict.entries.map((e) => `${e.origin}="${e.value}"`).join(" vs "),
  );
}

for (const metric of live.metrics) {
  if (!metric.hasCompleteProvenance) {
    problems.push(`Unsourced metric in DB: ${metric.label} (${metric.geography.label}) = ${metric.value}`);
  }
}

// hero_stats is retired as a source of truth but is still editable in admin.
const byLabel = new Map(live.metrics.map((m) => [m.label.trim().toLowerCase(), m]));
for (const stat of heroStats) {
  const metric = byLabel.get(String(stat.label ?? "").trim().toLowerCase());
  if (!metric) continue;
  if (String(normalizeMetricValue(stat.value)) !== String(normalizeMetricValue(metric.value))) {
    problems.push(
      `hero_stats "${stat.label}" = ${stat.value} contradicts the canonical ${metric.value} ` +
        `(hero_stats is no longer published — fix or clear the row).`,
    );
  }
}

// The committed fallback must match what the DB would serve right now.
let committed = null;
try {
  committed = JSON.parse(readFileSync(snapshotPath, "utf8"));
} catch (error) {
  problems.push(`Cannot read committed snapshot: ${error.message}`);
}

if (committed) {
  const expected = marketSnapshotFingerprint(committed);
  if (committed._meta?.market_fingerprint !== expected) {
    problems.push("Committed snapshot fingerprint does not match its own payload — it was hand-edited.");
  }

  const fallback = buildMarketDataSet({
    observations: committed.marketObservations ?? [],
    snapshotCards: committed.marketSnapshot ?? [],
  });
  const fallbackById = new Map(fallback.metrics.map((m) => [m.id, m]));
  for (const metric of live.metrics) {
    const mirrored = fallbackById.get(metric.id);
    if (!mirrored) {
      problems.push(`Fallback is missing ${metric.id} — re-export the snapshot.`);
      continue;
    }
    if (String(normalizeMetricValue(mirrored.value)) !== String(normalizeMetricValue(metric.value))) {
      problems.push(
        `Fallback drift on ${metric.id}: DB="${metric.value}" but committed snapshot="${mirrored.value}". ` +
          "Run: DATABASE_URL=... node scripts/export-content-snapshot.mjs",
      );
    }
    if (metric.changeLabel && mirrored.changeLabel && metric.changeLabel !== mirrored.changeLabel) {
      problems.push(
        `Fallback drift on ${metric.id} change line: DB="${metric.changeLabel}" but committed="${mirrored.changeLabel}".`,
      );
    }
  }
}

console.log(`Canonical metrics in DB: ${live.metrics.length} (updated ${live.updatedAt ?? "unknown"})`);
for (const metric of live.metrics) {
  console.log(
    `  ${metric.label} · ${metric.geography.label} = ${metric.value}` +
      `${metric.changeLabel ? ` (${metric.changeLabel})` : ""} — ${metric.source.name}, ${metric.period.label}`,
  );
}

if (problems.length > 0) {
  console.error(`\n${problems.length} market-data consistency problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log("\nMarket data is consistent: DB, committed fallback, and every public surface agree.");
