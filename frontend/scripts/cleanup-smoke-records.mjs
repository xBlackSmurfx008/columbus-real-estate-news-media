#!/usr/bin/env node
// Sweep our own test traffic out of the audience tables.
//
// Controlled smoke rows are useful for route verification, but every one of
// them was being counted as audience growth (owner plan 2026-09-04, item 2).
// This script classifies rows with the SHARED predicate in test-traffic-lib.mjs
// — the same one the capture routes and kpi-report.mjs use — and marks them.
//
// Default is a dry run. Flagging is preferred over deletion so the history
// stays auditable; deletion prints the full rows first and is opt-in.
//
//   node scripts/cleanup-smoke-records.mjs                       # dry run
//   node scripts/cleanup-smoke-records.mjs --flag --confirm=test-traffic
//   node scripts/cleanup-smoke-records.mjs --delete --confirm=test-traffic

import { neon } from "@neondatabase/serverless";
import {
  TEST_TRAFFIC_TABLES,
  resolveTestTrafficPredicates,
  testTrafficTableDefinition,
} from "./test-traffic-lib.mjs";

const args = process.argv.slice(2);
const flagMode = args.includes("--flag");
const deleteMode = args.includes("--delete");
const confirmed = args.includes("--confirm=test-traffic") || args.includes("--confirm=codex-smoke");

if ((flagMode || deleteMode) && !confirmed) {
  console.error("Refusing to write without --confirm=test-traffic.");
  process.exit(1);
}
if (flagMode && deleteMode) {
  console.error("Choose either --flag or --delete, not both.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);
const tables = Object.keys(TEST_TRAFFIC_TABLES);
const report = { ok: true, mode: deleteMode ? "delete" : flagMode ? "flag" : "dry-run", tables: {} };

for (const table of tables) {
  let predicates;
  try {
    predicates = await resolveTestTrafficPredicates(sql, table);
  } catch {
    report.tables[table] = { error: "unavailable" };
    continue;
  }
  if (predicates.columns.length === 0) {
    report.tables[table] = { error: "table not found" };
    continue;
  }

  const definition = testTrafficTableDefinition(table);
  const flagColumn = predicates.columns.includes(definition.flagColumn) ? definition.flagColumn : null;

  const [{ n: matched }] = await sql.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${predicates.testWhere}`,
  );
  const alreadyFlagged = flagColumn
    ? (await sql.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE COALESCE(${flagColumn}, false)`))[0].n
    : null;

  const entry = { matched, alreadyFlagged };

  if (deleteMode) {
    // Print every row before it disappears — a deletion nobody can audit is
    // exactly the failure mode this whole exercise is about.
    const rows = await sql.query(`SELECT * FROM ${table} WHERE ${predicates.testWhere} ORDER BY id`);
    console.error(`--- rows about to be deleted from ${table} (${rows.length}) ---`);
    for (const row of rows) console.error(JSON.stringify(row));
    const deleted = await sql.query(`DELETE FROM ${table} WHERE ${predicates.testWhere} RETURNING id`);
    entry.deleted = deleted.length;
  } else if (flagMode) {
    if (!flagColumn) {
      entry.error = `no ${definition.flagColumn} column — run scripts/migrate-funnel-events.mjs first`;
    } else {
      const flagged = await sql.query(
        `UPDATE ${table} SET ${flagColumn} = true
          WHERE ${predicates.testWhere} AND COALESCE(${flagColumn}, false) = false
          RETURNING id`,
      );
      entry.newlyFlagged = flagged.length;
    }
  }

  report.tables[table] = entry;
}

report.totalMatched = Object.values(report.tables).reduce((sum, entry) => sum + (entry.matched ?? 0), 0);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
