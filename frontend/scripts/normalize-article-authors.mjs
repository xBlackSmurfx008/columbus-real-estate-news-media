#!/usr/bin/env node
// One newsroom identity (owner plan 2026-09-04, P1 item 7).
// Prints the full byline distribution and every affected article id, then
// normalizes the known newsroom byline variants to CREN Newsroom.
//
// Dry run (default):  DATABASE_URL=... node scripts/normalize-article-authors.mjs
// Apply the update:   DATABASE_URL=... node scripts/normalize-article-authors.mjs --apply

import { neon } from "@neondatabase/serverless";
import {
  APPROVED_AUTHORS,
  CANONICAL_NEWSROOM_AUTHOR,
  NEWSROOM_AUTHOR_ALIASES,
} from "./newsroom-authors.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const sql = neon(databaseUrl);

const before = await sql`
  SELECT author, COUNT(*)::int AS n FROM articles GROUP BY author ORDER BY n DESC, author
`;
console.log("Byline distribution BEFORE:");
for (const row of before) console.log(`  ${String(row.n).padStart(4)}  ${row.author}`);

const affected = await sql`
  SELECT id, author, status FROM articles
  WHERE author = ANY(${NEWSROOM_AUTHOR_ALIASES}) ORDER BY author, id
`;
console.log(`\nArticles to normalize to "${CANONICAL_NEWSROOM_AUTHOR}": ${affected.length}`);
for (const row of affected) {
  console.log(`  ${row.author.padEnd(20)} | ${String(row.status).padEnd(8)} | ${row.id}`);
}

const unknown = before
  .map((row) => row.author)
  .filter((a) => !APPROVED_AUTHORS.includes(a) && !NEWSROOM_AUTHOR_ALIASES.includes(a));
if (unknown.length > 0) {
  console.log("\nBylines that are neither approved nor a known alias (left untouched):");
  for (const author of unknown) console.log(`  ${author}`);
}

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write the update.");
  process.exit(0);
}

const updated = await sql`
  UPDATE articles SET author = ${CANONICAL_NEWSROOM_AUTHOR}, updated_at = NOW()
  WHERE author = ANY(${NEWSROOM_AUTHOR_ALIASES}) RETURNING id
`;
console.log(`\nUpdated ${updated.length} rows.`);

const after = await sql`
  SELECT author, COUNT(*)::int AS n FROM articles GROUP BY author ORDER BY n DESC, author
`;
console.log("Byline distribution AFTER:");
for (const row of after) console.log(`  ${String(row.n).padStart(4)}  ${row.author}`);
