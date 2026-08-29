#!/usr/bin/env node
// Creates the activation_events table for conversion and preference analytics.
// Safe to re-run. Privacy: no raw IP or full user agent is stored; visitor_hash
// rotates daily and payload keys are sanitized by /api/analytics/event.
// Usage: DATABASE_URL=... node scripts/migrate-activation-events.mjs

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS activation_events (
    id BIGSERIAL PRIMARY KEY,
    event_name TEXT NOT NULL,
    path TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    visitor_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS activation_events_created_at_idx ON activation_events (created_at)`;
await sql`CREATE INDEX IF NOT EXISTS activation_events_event_name_idx ON activation_events (event_name)`;
await sql`CREATE INDEX IF NOT EXISTS activation_events_path_idx ON activation_events (path)`;

const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM activation_events`;
console.log(`activation_events table ready (${n} row(s) so far).`);
