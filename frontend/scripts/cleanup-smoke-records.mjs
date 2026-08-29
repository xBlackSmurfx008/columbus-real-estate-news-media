#!/usr/bin/env node
// Controlled production-smoke rows are useful for route verification, but they
// should not remain mixed into real audience tables. This script is dry-run by
// default and deletes only rows with the codex-smoke markers.

import { neon } from "@neondatabase/serverless";
import { SMOKE_TABLES, smokeCountQuery, smokeDeleteQuery } from "./smoke-records-lib.mjs";

const args = process.argv.slice(2);
const write = args.includes("--delete");
const confirmArg = args.find((arg) => arg.startsWith("--confirm="));
const confirmed = confirmArg === "--confirm=codex-smoke";

if (write && !confirmed) {
  console.error("Refusing to delete without --confirm=codex-smoke.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);
const tables = Object.keys(SMOKE_TABLES);
const before = {};
const deleted = {};

for (const table of tables) {
  const rows = await sql.query(smokeCountQuery(table));
  before[table] = rows[0].n;
}

if (write) {
  for (const table of tables) {
    const rows = await sql.query(smokeDeleteQuery(table));
    deleted[table] = rows.length;
  }
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  mode: write ? "delete" : "dry-run",
  before,
  totalBefore: Object.values(before).reduce((sum, n) => sum + n, 0),
  ...(write ? { deleted, totalDeleted: Object.values(deleted).reduce((sum, n) => sum + n, 0) } : {}),
}, null, 2)}\n`);
