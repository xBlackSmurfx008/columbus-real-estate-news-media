#!/usr/bin/env node
/**
 * Additive, idempotent migration for the coverage calendar.
 *
 * WHY A TABLE AND NOT A FILE
 * --------------------------
 * The calendar has one writer that is not a human editing a file: the publish
 * path, which closes an entry out the moment a story covering it goes live.
 * That write has to be atomic with respect to the daily run, has to survive in
 * the same place the routine already authenticates to, and has to be readable
 * by the weekly scorecard. `briefs/*.md` are immutable per-day records — a
 * brief written on Sept. 4 cannot learn on Sept. 22 that its entry was covered
 * — and a mutable JSON file in git would mean the cloud routine committing a
 * data file on every publish, with merge conflicts between two runs on the
 * same day. The routine already has DATABASE_URL; a table is the cheap option.
 *
 * What stays in git is the *provenance*: `content/coverage-calendar/seed.json`
 * carries every entry with the article or brief it came from, so the calendar's
 * sourcing is reviewable in a diff. The table is the operating copy.
 *
 * Safe to rerun. Creates nothing that exists, drops nothing, and touches no
 * other table.
 *
 * Usage: DATABASE_URL=... node scripts/migrate-coverage-calendar.mjs
 */

import { neon } from "@neondatabase/serverless";
import { ensureCoverageCalendarSchema } from "./coverage-calendar-store.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);
const result = await ensureCoverageCalendarSchema(sql, { verbose: true });

const [counts] = await sql`
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE status = 'upcoming')::int AS upcoming,
    COUNT(*) FILTER (WHERE status = 'covered')::int AS covered,
    COUNT(*) FILTER (WHERE status = 'missed')::int AS missed,
    COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
  FROM coverage_calendar
`;

console.log(
  `coverage_calendar: ${counts.total} row(s) — ${counts.upcoming} upcoming, ${counts.covered} covered, `
  + `${counts.missed} missed, ${counts.cancelled} cancelled`,
);
console.log(result.created.length > 0 ? `created: ${result.created.join(", ")}` : "no schema changes needed");
console.log("coverage calendar migration complete");
console.log("Next: node scripts/coverage-calendar.mjs seed");
