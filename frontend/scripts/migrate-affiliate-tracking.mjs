#!/usr/bin/env node
// Additive, introspect-first migration for outbound-click tracking and the
// affiliate program registry (owner plan 2026-09-04, P2 item 10). Safe to
// re-run: a second run prints only "skip" lines. Nothing is dropped, renamed,
// or destructively backfilled.
//
// Creates:
//   affiliate_clicks.<dimensions>   partner -> page -> area -> intent, plus
//                                   placement, destination host, campaign
//                                   source, referrer host, visitor hash, and
//                                   whether the click actually paid
//   affiliate_programs              the ONE record of a real affiliate
//                                   relationship, seeded `unconfigured` with
//                                   no IDs because CREN has joined no program
//
// Nothing here invents a partner, a network, a tracking ID, or a commission.
// The seeded rows say, truthfully, "no relationship configured".
//
// Usage: DATABASE_URL=... node --experimental-strip-types scripts/migrate-affiliate-tracking.mjs

import { neon } from "@neondatabase/serverless";
import { OUTBOUND_PARTNERS } from "../lib/outbound-partners.ts";

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

// --- Phase A: the outbound-click dimension set --------------------------------
// `partner_slug`, `path` (the page), `referrer`, `created_at` and `is_test`
// already exist. These complete partner -> page -> area -> intent and add the
// context needed to tell revenue from leakage.
const CLICK_COLUMNS = [
  ["destination_key", "TEXT"],
  ["area", "TEXT"],
  ["intent", "TEXT"],
  ["placement", "TEXT"],
  ["destination_host", "TEXT"],
  ["is_affiliate", "BOOLEAN NOT NULL DEFAULT false"],
  ["campaign_source", "TEXT"],
  ["referrer_host", "TEXT"],
  ["visitor_hash", "TEXT"],
  ["exclusion_reason", "TEXT"],
];

for (const [column, ddl] of CLICK_COLUMNS) {
  await ensureColumn("affiliate_clicks", column, ddl);
}

if (await tableExists("affiliate_clicks")) {
  await sql`CREATE INDEX IF NOT EXISTS affiliate_clicks_created_at_idx ON affiliate_clicks (created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS affiliate_clicks_partner_idx ON affiliate_clicks (partner_slug, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS affiliate_clicks_is_test_idx ON affiliate_clicks (is_test)`;
  console.log("ensured: affiliate_clicks indexes");
}

// --- Phase B: the affiliate program registry ----------------------------------
if (await tableExists("affiliate_programs")) {
  console.log("skip: table affiliate_programs exists");
} else {
  await sql`
    CREATE TABLE affiliate_programs (
      partner_slug TEXT PRIMARY KEY,
      program_name TEXT,
      network TEXT,
      partner_id TEXT,
      tracking_url_template TEXT,
      status TEXT NOT NULL DEFAULT 'unconfigured',
      notes TEXT,
      joined_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT affiliate_programs_status_check
        CHECK (status IN ('unconfigured', 'pending', 'active'))
    )
  `;
  console.log("created: table affiliate_programs");
}

// One row per partner in the code registry, so the owner always has a place to
// paste a real ID and the report can always name what is still unmonetized.
// Existing rows are never overwritten — a configured relationship survives a
// re-run untouched.
for (const partner of OUTBOUND_PARTNERS) {
  const inserted = await sql`
    INSERT INTO affiliate_programs (partner_slug, status, notes)
    VALUES (
      ${partner.slug},
      'unconfigured',
      ${`No affiliate relationship with ${partner.name} has been established. Links ship as plain outbound links until program_name, partner_id and tracking_url_template are filled in and status is set to 'active'.`}
    )
    ON CONFLICT (partner_slug) DO NOTHING
    RETURNING partner_slug
  `;
  console.log(
    inserted.length > 0
      ? `seeded: affiliate_programs/${partner.slug} (unconfigured)`
      : `skip: affiliate_programs/${partner.slug} already present`,
  );
}

const [{ n: programCount }] = await sql`SELECT COUNT(*)::int AS n FROM affiliate_programs`;
const [{ n: activeCount }] =
  await sql`SELECT COUNT(*)::int AS n FROM affiliate_programs WHERE status = 'active'`;
console.log(`\naffiliate_programs ready (${programCount} row(s), ${activeCount} active).`);
if (activeCount === 0) {
  console.log("No affiliate program is active. Every partner link ships as a plain outbound link");
  console.log("with no FTC disclosure, which is the correct state until a program is actually joined.");
  console.log("See docs/AFFILIATE_PROGRAMS.md for what the owner must sign up for.");
}
console.log("migration complete");
