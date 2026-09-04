// ============================================================
// Market-data consistency gate — this test fails the build.
//
// Owner's definition of done (2026-09-04): "an automated test fails the
// build when two current surfaces report different values for the same
// geography and period."
//
// It runs against the committed outage fallback (content/snapshot/
// public-data.json), which is deterministic and needs no database, and
// it exercises the exact selectors the real pages use.
// ============================================================

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMarketDataSet,
  formatPeriod,
  normalizeMetricValue,
  selectAllMetrics,
  selectAreaMetrics,
  selectHeadlineMetrics,
  marketDataStructuredData,
} from "../lib/market-data-core.ts";
import { marketSnapshotFingerprint } from "../scripts/market-snapshot-fingerprint.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(here, "..", "content", "snapshot", "public-data.json");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));

const set = buildMarketDataSet({
  observations: snapshot.marketObservations ?? [],
  snapshotCards: snapshot.marketSnapshot ?? [],
  fromFallback: true,
});

test("no two stored records disagree about the same metric, geography and period", () => {
  assert.deepEqual(
    set.conflicts,
    [],
    "Canonical market conflict(s):\n" +
      set.conflicts
        .map(
          (c) =>
            `  ${c.metricKey} @ ${c.geographySlug} (${c.propertyType}): ` +
            c.entries.map((e) => `${e.origin}="${e.value}" [${e.periodLabel}]`).join(" vs "),
        )
        .join("\n"),
  );
});

test("every published metric carries value, geography, period, source and updated_at", () => {
  assert.ok(set.metrics.length > 0, "canonical market set is empty — the fallback has no market data");
  for (const metric of set.metrics) {
    assert.ok(metric.value.trim(), `${metric.id} has no value`);
    assert.ok(metric.geography.slug && metric.geography.label, `${metric.id} has no geography`);
    assert.ok(metric.period.label, `${metric.id} has no period`);
    assert.ok(metric.source.name, `${metric.id} has no source name`);
    assert.ok(metric.source.url, `${metric.id} has no source URL`);
    assert.ok(metric.hasCompleteProvenance, `${metric.id} has incomplete provenance`);
    assert.ok(metric.updatedAt, `${metric.id} has no updated_at`);
  }
});

test("current surfaces render identical values for the same metric and geography", () => {
  // Each entry mirrors how a real surface builds its numbers.
  const surfaces = {
    "homepage stat bar": selectHeadlineMetrics(set, 4),
    "market-data headline": selectHeadlineMetrics(set),
    "market-data table": selectAllMetrics(set),
    "embed widget": selectHeadlineMetrics(set),
    ...Object.fromEntries(
      [...new Set(set.metrics.map((m) => m.geography.slug))].map((slug) => [
        `area hub /areas/${slug}`,
        selectAreaMetrics(set, slug),
      ]),
    ),
  };

  const seen = new Map(); // metricKey::geography -> { value, period, surface }
  for (const [surface, metrics] of Object.entries(surfaces)) {
    for (const metric of metrics) {
      const key = `${metric.metricKey}::${metric.geography.slug}::${metric.propertyType}`;
      const observed = {
        value: String(normalizeMetricValue(metric.value)),
        period: formatPeriod(metric),
        surface,
      };
      const previous = seen.get(key);
      if (!previous) {
        seen.set(key, observed);
        continue;
      }
      assert.equal(
        observed.value,
        previous.value,
        `"${surface}" shows ${metric.value} for ${key} but "${previous.surface}" shows a different value`,
      );
      assert.equal(
        observed.period,
        previous.period,
        `"${surface}" shows period ${observed.period} for ${key} but "${previous.surface}" shows ${previous.period}`,
      );
    }
  }
});

test("hero_stats is no longer a second copy of any published market number", () => {
  // hero_stats survives for the admin panel, but if it still carries the same
  // metric it must not contradict the canonical value.
  const heroStats = snapshot.heroStats ?? [];
  const byLabel = new Map(set.metrics.map((m) => [m.label.trim().toLowerCase(), m]));
  for (const stat of heroStats) {
    const metric = byLabel.get(String(stat.label ?? "").trim().toLowerCase());
    if (!metric) continue;
    assert.equal(
      String(normalizeMetricValue(stat.value)),
      String(normalizeMetricValue(metric.value)),
      `hero_stats "${stat.label}" = ${stat.value} contradicts the canonical ${metric.value}`,
    );
  }
});

test("the committed outage fallback carries the market payload it must serve", () => {
  assert.ok(Array.isArray(snapshot.marketSnapshot) && snapshot.marketSnapshot.length > 0);
  assert.ok(Array.isArray(snapshot.marketObservations) && snapshot.marketObservations.length > 0);
  assert.ok(Array.isArray(snapshot.neighborhoods) && snapshot.neighborhoods.length > 0);
});

test("the fallback fingerprint matches its own market payload", () => {
  // Recomputed here so a hand-edited market number in the committed fallback
  // (the exact way it drifted from the database) fails the build.
  assert.equal(
    snapshot._meta?.market_fingerprint,
    marketSnapshotFingerprint(snapshot),
    "content/snapshot/public-data.json was edited without re-exporting — run: DATABASE_URL=... node scripts/export-content-snapshot.mjs",
  );
});

test("structured data publishes only fully sourced metrics", () => {
  const jsonLd = marketDataStructuredData(set, "https://columbusrealestatenews.com/market-data");
  assert.equal(jsonLd["@type"], "Dataset");
  assert.equal(jsonLd.dateModified, set.updatedAt);
  assert.equal(jsonLd.variableMeasured.length, set.metrics.filter((m) => m.hasCompleteProvenance).length);
  for (const measured of jsonLd.variableMeasured) {
    assert.ok(measured.value, "structured data measure has no value");
    assert.ok(measured.url, "structured data measure has no source URL");
  }
});

// ---------- reconciliation unit tests ----------

test("a stale duplicate of the same metric is reported as a conflict", () => {
  // This is the exact 2026-09-04 failure: the DB said +9.8% YoY while the
  // committed fallback still said +7% YoY for the same series.
  const conflicted = buildMarketDataSet({
    observations: [
      {
        id: 1,
        metric_key: "active-listings",
        label: "Active listings",
        value_display: "6,193",
        value_numeric: 6193,
        geography_type: "metro",
        geography_slug: "columbus-metro",
        geography_label: "Columbus & Central Ohio",
        property_type: "all-residential",
        period_start: "2026-07-01",
        period_end: "2026-07-31",
        as_of_date: "2026-07-31",
        source_name: "Columbus REALTORS",
        source_url: "https://example.org/report",
        methodology_url: null,
      },
    ],
    snapshotCards: [
      {
        id: 2,
        label: "Active Listings",
        value: "5,223",
        change: "+8.2% YoY",
        direction: "up",
        source_name: "Columbus REALTORS",
        source_url: "https://example.org/report",
        source_date: "July 2026",
      },
    ],
  });
  assert.equal(conflicted.conflicts.length, 1);
  assert.equal(conflicted.conflicts[0].metricKey, "active-listings");
});

test("an abbreviated display of the same number is not a conflict", () => {
  assert.equal(normalizeMetricValue("$350K"), normalizeMetricValue("$350,000"));
  assert.notEqual(normalizeMetricValue("+9.8% YoY"), normalizeMetricValue("+7% YoY"));
});

test("the freshest record wins and no number is invented", () => {
  const merged = buildMarketDataSet({
    snapshotCards: [
      { id: 1, label: "Months of Supply", value: "2.4", change: "July 2026", direction: "neutral", source_name: "Columbus REALTORS", source_url: "https://example.org/r", source_date: "July 2026 report, released August 12, 2026" },
    ],
  });
  const metric = merged.metrics[0];
  assert.equal(metric.value, "2.4");
  assert.equal(metric.period.end, "2026-07-31", "period comes from the stated reporting month, not the release date");
  assert.equal(metric.geography.slug, "columbus-metro");
});
