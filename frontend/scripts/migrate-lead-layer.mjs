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

// --- Phase B: leads ---

await ensureTable(
  "leads",
  `CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    persona TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    area TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    consent BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`
);

if (await indexExists("leads_persona_idx")) {
  console.log("skip: index leads_persona_idx exists");
} else {
  await sql`CREATE INDEX leads_persona_idx ON leads(persona, created_at DESC)`;
  console.log("created: index leads_persona_idx");
}

// --- Phase C: members ---

await ensureTable(
  "members",
  `CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    interests TEXT,
    tier TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    stripe_customer_id TEXT,
    tier_started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`
);

// --- Phase D: affiliates ---

await ensureTable(
  "affiliate_partners",
  `CREATE TABLE affiliate_partners (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    url TEXT NOT NULL,
    blurb TEXT,
    cta_text TEXT DEFAULT 'Learn more',
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`
);

await ensureTable(
  "affiliate_clicks",
  `CREATE TABLE affiliate_clicks (
    id SERIAL PRIMARY KEY,
    partner_slug TEXT NOT NULL,
    path TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`
);

// Seed placeholder partners once (real programs replace these; URLs point at
// vendor homepages until affiliate accounts exist).
const partnerCount = await sql`SELECT COUNT(*)::int AS n FROM affiliate_partners`;
if (partnerCount[0].n > 0) {
  console.log(`skip: affiliate_partners already has ${partnerCount[0].n} rows`);
} else {
  const seed = [
    ["home-warranty", "Home Warranty Coverage", "home-services", "https://www.example.com/home-warranty", "Protect the big systems — HVAC, plumbing, electric — before they protect themselves out of your budget.", "Compare plans", 0],
    ["moving-services", "Columbus Moving Help", "home-services", "https://www.example.com/moving", "Vetted local movers for apartments and whole houses.", "Get moving quotes", 1],
    ["renters-insurance", "Renters Insurance", "finance", "https://www.example.com/renters-insurance", "Most Columbus landlords require it. Takes minutes to set up.", "Get a quote", 2],
    ["mortgage-rates", "Mortgage Rate Check", "finance", "https://www.example.com/mortgage", "See today's rates from multiple lenders before you commit to one.", "Check rates", 3],
    ["diy-tools", "Home Improvement Supplies", "home-services", "https://www.example.com/tools", "Order project supplies and pick up locally.", "Shop supplies", 4],
  ];
  for (const [slug, name, category, url, blurb, cta, sort] of seed) {
    await sql`INSERT INTO affiliate_partners (slug, name, category, url, blurb, cta_text, active, sort_order)
      VALUES (${slug}, ${name}, ${category}, ${url}, ${blurb}, ${cta}, true, ${sort})`;
  }
  console.log("seeded: 5 placeholder affiliate partners (replace URLs when programs are live)");
}

console.log("migration complete");
