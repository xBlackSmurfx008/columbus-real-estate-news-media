#!/usr/bin/env node
// Creates the page_views table for server-side traffic instrumentation
// (CMO directive 2026-08-17 P1). Safe to re-run: everything is IF NOT EXISTS.
// Privacy: no raw IP or full user agent is ever stored. visitor_hash is a
// SHA-256 of ip+ua+UTC-date, so it rotates daily and cannot be joined across days.
// Usage: DATABASE_URL=... node scripts/migrate-page-views.mjs

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS page_views (
    id BIGSERIAL PRIMARY KEY,
    path TEXT NOT NULL,
    article_id TEXT,
    referrer_host TEXT,
    visitor_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON page_views (created_at)`;
await sql`CREATE INDEX IF NOT EXISTS page_views_path_idx ON page_views (path)`;

const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM page_views`;
console.log(`page_views table ready (${n} row(s) so far).`);
