// Stale statistics.
//
// The market-data work that shipped earlier today already owns "do our copies
// of a number agree" (scripts/verify-market-consistency.mjs against the live
// DB, tests/market-data-consistency.test.mjs against the committed fallback).
// This module INVOKES both rather than restating either, and adds the two
// questions neither one can answer:
//
//   freshness  - a number every copy agrees on can still be months out of date.
//   deployed   - the built/served page can be behind the database it agrees
//                with, because ISR caches. Consistency in the repo is not the
//                same claim as consistency on the site a reader loads.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { openDatabase } from "../db.mjs";
import { textContent } from "../html.mjs";
import { fail, pass, skip, verdict } from "../result.mjs";
import { FRONTEND_ROOT, runNode, tail } from "../spawn.mjs";
import { url as targetUrl } from "../target.mjs";

// Cadence of the underlying series decides what "stale" means. A weekly rate
// survey and a monthly MLS report cannot share one budget without either
// excusing a dead rate or crying wolf about a normal reporting lag.
const CADENCES = [
  { match: /mortgage|rate/i, label: "weekly series", advisoryDays: 21, blockingDays: 60 },
  { match: /.*/, label: "monthly series", advisoryDays: 45, blockingDays: 120 },
];

export function cadenceFor(label) {
  return CADENCES.find((entry) => entry.match.test(String(label ?? "")));
}

/**
 * Pull the most recent real date out of a human `source_date` string such as
 * "July 2026 report, released August 12, 2026" or "August 27, 2026".
 * Returns null when nothing parseable is there — which the caller reports as a
 * finding, never as freshness.
 */
export function parseSourceDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const found = [];
  const monthDayYear = /\b([A-Z][a-z]{2,8})\.?\s+(\d{1,2}),?\s+(\d{4})\b/g;
  let match;
  while ((match = monthDayYear.exec(value)) !== null) {
    const parsed = new Date(`${match[1]} ${match[2]}, ${match[3]} UTC`);
    if (!Number.isNaN(parsed.getTime())) found.push(parsed);
  }
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((match = iso.exec(value)) !== null) {
    const parsed = new Date(`${match[0]}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) found.push(parsed);
  }
  if (found.length === 0) {
    // Month + year only ("July 2026") — treat as the first of that month.
    const monthYear = /\b([A-Z][a-z]{2,8})\s+(\d{4})\b/g;
    while ((match = monthYear.exec(value)) !== null) {
      const parsed = new Date(`${match[1]} 1, ${match[2]} UTC`);
      if (!Number.isNaN(parsed.getTime())) found.push(parsed);
    }
  }
  if (found.length === 0) return null;
  return new Date(Math.max(...found.map((date) => date.getTime())));
}

export function daysBetween(from, to) {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export const marketConsistency = {
  id: "stats-consistency",
  title: "Market statistics agree across every copy",
  blocking: true,
  async run() {
    const findings = [];

    // Half 1: the committed fallback, DB-free, same test the build runs.
    const testPath = join(FRONTEND_ROOT, "tests", "market-data-consistency.test.mjs");
    if (!existsSync(testPath)) {
      return skip(
        "stats-consistency",
        "Market statistics agree across every copy",
        true,
        "tests/market-data-consistency.test.mjs is missing from this checkout",
      );
    }
    const testRun = await runNode(["--experimental-strip-types", "--test", "tests/market-data-consistency.test.mjs"]);
    if (!testRun.ok) {
      findings.push("committed snapshot: market-data-consistency test FAILED");
      findings.push(...tail(`${testRun.stdout}\n${testRun.stderr}`, 10).map((line) => `  ${line}`));
    }

    // Half 2: the live database, via the script that owns this rule.
    const { sql, reason } = await openDatabase();
    if (!sql) {
      if (findings.length > 0) {
        return fail(
          "stats-consistency",
          "Market statistics agree across every copy",
          true,
          "committed-snapshot half failed; database half could not run",
          [...findings, `database half SKIPPED: ${reason}`],
        );
      }
      return skip(
        "stats-consistency",
        "Market statistics agree across every copy",
        true,
        `committed-snapshot half passed, but the database half needs credentials — ${reason}`,
      );
    }

    const dbRun = await runNode(["--experimental-strip-types", "scripts/verify-market-consistency.mjs"]);
    if (!dbRun.ok) {
      findings.push("live database: verify-market-consistency FAILED");
      findings.push(...tail(`${dbRun.stdout}\n${dbRun.stderr}`, 12).map((line) => `  ${line}`));
    }

    return verdict(
      "stats-consistency",
      "Market statistics agree across every copy",
      true,
      findings,
      "committed fallback and live database agree on every canonical metric",
      "market statistics disagree between copies",
    );
  },
};

export const marketFreshness = {
  id: "stats-freshness",
  title: "Market statistics are current",
  blocking: true,
  async run(context) {
    const { sql, reason } = await openDatabase();
    if (!sql) return skip("stats-freshness", "Market statistics are current", true, reason);

    const rows = await sql`SELECT label, value, source_name, source_date FROM market_snapshot ORDER BY sort_order`;
    if (rows.length === 0) {
      return fail("stats-freshness", "Market statistics are current", true, "market_snapshot is empty", [
        "market_snapshot has no rows; every public market number would fall back to the committed snapshot",
      ]);
    }

    const now = context.now ?? new Date();
    const blocking = [];
    const advisory = [];
    const ages = [];

    for (const row of rows) {
      const cadence = cadenceFor(row.label);
      const asOf = parseSourceDate(row.source_date);
      if (!asOf) {
        blocking.push(`${row.label} — source_date "${row.source_date ?? ""}" has no parseable date, so freshness cannot be verified`);
        continue;
      }
      const age = daysBetween(asOf, now);
      ages.push({ label: row.label, ageDays: age, cadence: cadence.label });
      if (age > cadence.blockingDays) {
        blocking.push(`${row.label} — ${age} days old (${row.source_name}, ${row.source_date}); ${cadence.label} ceiling is ${cadence.blockingDays} days`);
      } else if (age > cadence.advisoryDays) {
        advisory.push(`${row.label} — ${age} days old (${row.source_name}, ${row.source_date}); ${cadence.label} budget is ${cadence.advisoryDays} days`);
      }
    }

    const stats = { metrics: rows.length, ages };
    if (blocking.length > 0) {
      return fail("stats-freshness", "Market statistics are current", true, `${blocking.length} market metric(s) past the hard staleness ceiling`, [...blocking, ...advisory], stats);
    }
    if (advisory.length > 0) {
      return fail("stats-freshness", "Market statistics are current", false, `${advisory.length} market metric(s) past the refresh budget`, advisory, stats);
    }
    return pass("stats-freshness", "Market statistics are current", true, `all ${rows.length} market metric(s) inside their refresh budget`, stats);
  },
};

export const marketDeployed = {
  id: "stats-deployed",
  title: "Served pages show the canonical market numbers",
  blocking: true,
  async run(context) {
    const { sql, reason } = await openDatabase();
    if (!sql) {
      return skip("stats-deployed", "Served pages show the canonical market numbers", true, `${reason} — cannot know what the served page should say`);
    }

    const response = context.pages.get("/market-data") ?? (await context.http.get(targetUrl(context.target, "/market-data")));
    if (!response.ok) {
      return fail("stats-deployed", "Served pages show the canonical market numbers", true, `/market-data did not render`, [
        `/market-data — ${response.error ?? `HTTP ${response.status}`}`,
      ]);
    }

    const rows = await sql`SELECT label, value FROM market_snapshot ORDER BY sort_order`;
    const text = textContent(response.text);
    const findings = [];
    for (const row of rows) {
      if (!row.value) continue;
      if (!text.includes(String(row.value))) {
        findings.push(`/market-data does not show "${row.value}" for ${row.label} — the served page is behind the database (stale ISR cache or an undeployed build)`);
      }
    }

    return verdict(
      "stats-deployed",
      "Served pages show the canonical market numbers",
      true,
      findings,
      `/market-data on ${context.target.origin} shows all ${rows.length} canonical value(s)`,
      `${findings.length} canonical market value(s) are missing from the served /market-data`,
      { target: context.target.origin, metrics: rows.length },
    );
  },
};
