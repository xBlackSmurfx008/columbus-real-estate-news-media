#!/usr/bin/env node
// Lists already-published articles so the daily pipeline can avoid duplicate topics.
// Default is ALL-TIME (the full backlog) so nothing already covered is ever invisible
// to the dedupe step. Pass a number to limit to the last N days instead.
// Usage: DATABASE_URL=... node scripts/recent-articles.mjs [days]

import { neon } from "@neondatabase/serverless";

const days = process.argv[2] ? Number(process.argv[2]) : null;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

const rows = days
  ? await sql`
      SELECT id, title, date, topic_slug, area_slug, created_at
      FROM articles
      WHERE created_at >= NOW() - (${days} || ' days')::interval
      ORDER BY created_at DESC
    `
  : await sql`
      SELECT id, title, date, topic_slug, area_slug, created_at
      FROM articles
      ORDER BY created_at DESC
    `;

const scope = days ? `in the last ${days} days` : "ever published (all-time)";
if (rows.length === 0) {
  console.log(`No articles found ${scope}.`);
} else {
  console.log(`${rows.length} article(s) ${scope} — do NOT duplicate any of these stories:\n`);
  for (const r of rows) {
    console.log(`- [${r.date}] (${r.topic_slug ?? "no-topic"} / ${r.area_slug ?? "no-area"}) ${r.title}  {id: ${r.id}}`);
  }
}
