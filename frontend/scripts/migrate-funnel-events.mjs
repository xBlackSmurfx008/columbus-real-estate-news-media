#!/usr/bin/env node
// Additive, introspect-first migration for end-to-end funnel telemetry
// (owner plan 2026-09-04, P0 item 2). Safe to re-run: a second run prints only
// "skip" lines. Nothing is dropped, renamed, or backfilled destructively.
//
// Creates:
//   funnel_events           one row per stage transition, per funnel
//   <audience tables>.is_test   explicit synthetic-traffic flag (default false)
//   leads.first_response_at     for response-time reporting
//   leads.value_cents           for value / revenue reporting
//
// Usage: DATABASE_URL=... node scripts/migrate-funnel-events.mjs

import { neon } from "@neondatabase/serverless";
import { FUNNEL_STAGES, FUNNEL_SLUGS } from "./funnel-lib.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

async function tableExists(name) {
  const rows = await sql`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=${name}`;
  return rows.length > 0;
}

async function columnExists(table, column) {
  const rows = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name=${table} AND column_name=${column}`;
  return rows.length > 0;
}

async function ensureColumn(table, column, ddlType) {
  if (!(await tableExists(table))) {
    console.log(`skip: table ${table} does not exist`);
    return;
  }
  if (await columnExists(table, column)) {
    console.log(`skip: ${table}.${column} exists`);
    return;
  }
  await sql.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddlType}`);
  console.log(`created: ${table}.${column}`);
}

// --- Phase A: explicit synthetic-traffic flags -------------------------------
// Flagging (not deleting) keeps the history auditable while guaranteeing that
// the shared exclusion predicate has something unambiguous to key on.
for (const table of ["subscribers", "contacts", "leads", "members", "affiliate_clicks", "consent_events"]) {
  await ensureColumn(table, "is_test", "BOOLEAN NOT NULL DEFAULT false");
}

// --- Phase B: lead SLA + value columns ---------------------------------------
await ensureColumn("leads", "first_response_at", "TIMESTAMPTZ");
await ensureColumn("leads", "value_cents", "INTEGER");

// --- Phase C: funnel_events ---------------------------------------------------
if (await tableExists("funnel_events")) {
  console.log("skip: table funnel_events exists");
} else {
  await sql`
    CREATE TABLE funnel_events (
      id BIGSERIAL PRIMARY KEY,
      funnel TEXT NOT NULL,
      stage TEXT NOT NULL,
      path TEXT,
      article_slug TEXT,
      article_url TEXT,
      area TEXT,
      placement TEXT,
      campaign_source TEXT,
      campaign_medium TEXT,
      campaign_name TEXT,
      referrer_host TEXT,
      visitor_hash TEXT,
      lead_id INTEGER,
      value_cents INTEGER,
      is_test BOOLEAN NOT NULL DEFAULT false,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("created: table funnel_events");
}

await sql`CREATE INDEX IF NOT EXISTS funnel_events_created_at_idx ON funnel_events (created_at)`;
await sql`CREATE INDEX IF NOT EXISTS funnel_events_funnel_stage_idx ON funnel_events (funnel, stage, created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS funnel_events_lead_idx ON funnel_events (lead_id)`;
await sql`CREATE INDEX IF NOT EXISTS funnel_events_is_test_idx ON funnel_events (is_test)`;
console.log("ensured: funnel_events indexes");

const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM funnel_events`;
console.log(`funnel_events ready (${n} row(s)).`);
console.log(`funnels: ${FUNNEL_SLUGS.join(", ")}`);
console.log(`stages: ${FUNNEL_STAGES.join(" -> ")}`);
console.log("migration complete");
