#!/usr/bin/env node
import { getSql, withRetry } from './image-job-store.mjs';
import { NEIGHBORHOOD_SOURCE_REGISTRY, PRIORITY_NEIGHBORHOOD_SLUGS } from './neighborhood-sources.mjs';

process.loadEnvFile?.('.env.local');

export function easternWeekStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const current = new Date(`${values.year}-${values.month}-${values.day}T12:00:00Z`);
  const mondayOffset = (current.getUTCDay() + 6) % 7;
  current.setUTCDate(current.getUTCDate() - mondayOffset);
  return current.toISOString().slice(0, 10);
}

async function main() {
  const sql = getSql();
  const weekStart = easternWeekStart();
  const weekly = await withRetry(() => sql`
    SELECT id, title, status, area_slug, created_at
    FROM articles
    WHERE category = 'Neighborhoods'
      AND (created_at AT TIME ZONE 'America/New_York')::date >= ${weekStart}::date
    ORDER BY created_at DESC
  `);
  const history = await withRetry(() => sql`
    SELECT area_slug, MAX(created_at) AS last_covered_at
    FROM articles
    WHERE category = 'Neighborhoods' AND area_slug IS NOT NULL
    GROUP BY area_slug
  `);
  const lastCovered = new Map(history.map((row) => [row.area_slug, row.last_covered_at]));
  const candidates = Object.entries(PRIORITY_NEIGHBORHOOD_SLUGS)
    .map(([name, slug]) => ({ name, slug, lastCoveredAt: lastCovered.get(slug) ?? null }))
    .sort((left, right) => {
      if (!left.lastCoveredAt) return -1;
      if (!right.lastCoveredAt) return 1;
      return new Date(left.lastCoveredAt) - new Date(right.lastCoveredAt);
    });

  const minimumPerWeek = 1;
  const maximumPerWeek = 2;
  const neededForMinimum = Math.max(0, minimumPerWeek - weekly.length);
  const roomThisWeek = Math.max(0, maximumPerWeek - weekly.length);
  process.stdout.write(`${JSON.stringify({
    weekStart,
    cadence: { minimumPerWeek, maximumPerWeek, neededForMinimum, roomThisWeek },
    publishedOrStagedThisWeek: weekly,
    suggestedAreas: candidates.slice(0, roomThisWeek || 2),
    sourceRegistry: NEIGHBORHOOD_SOURCE_REGISTRY,
    rules: [
      'Every neighborhood story must use one specific area_slug and the neighborhood tag.',
      'Use at least two independent fetched sources, including one primary record.',
      'Prefer a new filing, dated decision, permit status, public project milestone, or verified market-data change.',
      'Publish zero rather than forcing a weak story; never exceed two Neighborhoods stories in one week.',
    ],
  }, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 1;
  });
}
