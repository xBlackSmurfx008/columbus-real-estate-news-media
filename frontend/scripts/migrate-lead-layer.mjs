#!/usr/bin/env node
// Introspect-first, idempotent migration for the lead-generation layer.
// Checks information_schema before every change and prints each action taken.
// Safe to run repeatedly; a second run should print only "skip" lines.
// Usage: DATABASE_URL=... node scripts/migrate-lead-layer.mjs

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

async function tableExists(name) {
  const r = await sql`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=${name}`;
  return r.length > 0;
}

async function indexExists(name) {
  const r = await sql`SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=${name}`;
  return r.length > 0;
}

async function ensureTable(name, ddl) {
  if (await tableExists(name)) {
    console.log(`skip: table ${name} exists`);
    return;
  }
  await sql.query(ddl);
  console.log(`created: table ${name}`);
}

// --- Phase A: subscribers + contacts (tables exist in prod; index may not) ---

await ensureTable(
  "subscribers",
  `CREATE TABLE subscribers (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    area TEXT,
    topic TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`
);

await ensureTable(
  "contacts",
  `CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`
);

if (await indexExists("subscribers_email_key")) {
  console.log("skip: index subscribers_email_key exists");
} else {
  const dupes = await sql`SELECT email FROM subscribers GROUP BY email HAVING COUNT(*) > 1`;
  if (dupes.length > 0) {
    console.log(`WARN: ${dupes.length} duplicate subscriber email(s) — index NOT created. Dedupe first:`);
    for (const d of dupes) console.log(`  - ${d.email}`);
  } else {
    await sql`CREATE UNIQUE INDEX subscribers_email_key ON subscribers(email)`;
    console.log("created: unique index subscribers_email_key");
  }
}

console.log("migration complete");
