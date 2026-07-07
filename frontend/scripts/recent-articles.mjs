#!/usr/bin/env node
// Lists articles from the last N days so the daily pipeline can avoid duplicate topics.
// Usage: DATABASE_URL=... node scripts/recent-articles.mjs [days]

import { neon } from "@neondatabase/serverless";

const days = Number(process.argv[2]) || 30;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

const rows = await sql`
  SELECT title, date, topic_slug, area_slug, created_at
  FROM articles
  WHERE created_at >= NOW() - (${days} || ' days')::interval
  ORDER BY created_at DESC
`;

if (rows.length === 0) {
  console.log(`No articles found in the last ${days} days.`);
} else {
  console.log(`${rows.length} article(s) in the last ${days} days:\n`);
  for (const r of rows) {
    console.log(`- [${r.date}] (${r.topic_slug ?? "no-topic"} / ${r.area_slug ?? "no-area"}) ${r.title}`);
  }
}
