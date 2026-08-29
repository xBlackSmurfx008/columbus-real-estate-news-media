#!/usr/bin/env node
// Idempotent migration for policy versions and normalized consent events.
// Usage: DATABASE_URL=... node --experimental-strip-types scripts/migrate-compliance-layer.mjs

import { neon } from "@neondatabase/serverless";
import { CURRENT_POLICY_VERSIONS, POLICY_ROUTES } from "../lib/compliance/policy-versions.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);
const OWNER_EXECUTION_STATUS = "owner_execution_version";
const OWNER_APPROVAL_BY = "owner-direction-no-gates-2026-08-29";

const POLICY_TITLES = {
  terms: "Terms of Use",
  privacy: "Privacy Policy",
  cookies: "Cookie and Tracking Policy",
  leadDisclosure: "Lead Disclosure Policy",
  advertisingTerms: "Advertising Terms",
  sponsoredContent: "Sponsored Content and Native Advertising Policy",
  fairHousing: "Fair Housing and Equal Opportunity Policy",
  listingQuality: "Listing and Directory Quality Policy",
  profileClaim: "Profile Claim Policy",
  communications: "Communications, Email, SMS, and Calling Policy",
  aiAutomation: "AI and Automation Policy",
  accessibility: "Accessibility Statement",
  copyright: "Copyright, DMCA, and Content Reuse Policy",
  submissions: "Submissions and Tips Policy",
};

async function tableExists(name) {
  const rows = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${name}
  `;
  return rows.length > 0;
}

async function ensureTable(name, ddl) {
  if (await tableExists(name)) {
    console.log(`skip: table ${name} exists`);
    return;
  }
  await sql.query(ddl);
  console.log(`created: table ${name}`);
}

async function ensureColumn(table, column, definition) {
  await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
  console.log(`ensured: ${table}.${column}`);
}

async function ensureIndex(name, ddl) {
  const rows = await sql`
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = ${name}
  `;
  if (rows.length > 0) {
    console.log(`skip: index ${name} exists`);
    return;
  }
  await sql.query(ddl);
  console.log(`created: index ${name}`);
}

await ensureTable(
  "policy_versions",
  `CREATE TABLE policy_versions (
    id BIGSERIAL PRIMARY KEY,
    policy_key TEXT NOT NULL,
    version TEXT NOT NULL,
    route TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'owner_execution_version',
    effective_at TIMESTAMPTZ,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

for (const [column, definition] of [
  ["policy_key", "TEXT"],
  ["version", "TEXT"],
  ["route", "TEXT"],
  ["title", "TEXT"],
  ["status", "TEXT NOT NULL DEFAULT 'owner_execution_version'"],
  ["effective_at", "TIMESTAMPTZ"],
  ["approved_by", "TEXT"],
  ["approved_at", "TIMESTAMPTZ"],
  ["notes", "TEXT"],
  ["created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"],
  ["updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"],
]) {
  await ensureColumn("policy_versions", column, definition);
}
await sql`ALTER TABLE policy_versions ALTER COLUMN status SET DEFAULT 'owner_execution_version'`;
console.log("ensured: policy_versions.status default");

await ensureIndex(
  "policy_versions_key_version_idx",
  "CREATE UNIQUE INDEX policy_versions_key_version_idx ON policy_versions(policy_key, version)",
);

await ensureTable(
  "consent_events",
  `CREATE TABLE consent_events (
    id BIGSERIAL PRIMARY KEY,
    actor_type TEXT NOT NULL DEFAULT 'anonymous',
    actor_id TEXT,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    email TEXT,
    phone TEXT,
    consent_type TEXT NOT NULL,
    consent_version TEXT NOT NULL,
    consent_text TEXT NOT NULL,
    policy_versions JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_route TEXT,
    form_id TEXT,
    form_version TEXT,
    recipient_category TEXT,
    compensation_disclosure_category TEXT,
    ip_hash TEXT,
    user_agent_hash TEXT,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

for (const [column, definition] of [
  ["actor_type", "TEXT NOT NULL DEFAULT 'anonymous'"],
  ["actor_id", "TEXT"],
  ["entity_type", "TEXT"],
  ["entity_id", "TEXT"],
  ["email", "TEXT"],
  ["phone", "TEXT"],
  ["consent_type", "TEXT"],
  ["consent_version", "TEXT"],
  ["consent_text", "TEXT"],
  ["policy_versions", "JSONB NOT NULL DEFAULT '{}'::jsonb"],
  ["source_route", "TEXT"],
  ["form_id", "TEXT"],
  ["form_version", "TEXT"],
  ["recipient_category", "TEXT"],
  ["compensation_disclosure_category", "TEXT"],
  ["ip_hash", "TEXT"],
  ["user_agent_hash", "TEXT"],
  ["revoked_at", "TIMESTAMPTZ"],
  ["created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"],
]) {
  await ensureColumn("consent_events", column, definition);
}

await ensureIndex(
  "consent_events_entity_idx",
  "CREATE INDEX consent_events_entity_idx ON consent_events(entity_type, entity_id, created_at DESC)",
);
await ensureIndex(
  "consent_events_email_idx",
  "CREATE INDEX consent_events_email_idx ON consent_events(email, created_at DESC) WHERE email IS NOT NULL",
);
await ensureIndex(
  "consent_events_type_idx",
  "CREATE INDEX consent_events_type_idx ON consent_events(consent_type, created_at DESC)",
);

for (const [policyKey, version] of Object.entries(CURRENT_POLICY_VERSIONS)) {
  await sql`
    INSERT INTO policy_versions (policy_key, version, route, title, status, effective_at, approved_by, approved_at, notes)
    VALUES (
      ${policyKey},
      ${version},
      ${POLICY_ROUTES[policyKey]},
      ${POLICY_TITLES[policyKey]},
      ${OWNER_EXECUTION_STATUS},
      NOW(),
      ${OWNER_APPROVAL_BY},
      NOW(),
      'Seeded from local CREN policy library on 2026-08-29. Owner execution version; not attorney approval.'
    )
    ON CONFLICT (policy_key, version) DO UPDATE
    SET route = EXCLUDED.route,
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        approved_by = COALESCE(policy_versions.approved_by, ${OWNER_APPROVAL_BY}),
        approved_at = COALESCE(policy_versions.approved_at, NOW()),
        notes = EXCLUDED.notes,
        updated_at = NOW()
  `;
  console.log(`seeded: policy_versions.${policyKey}.${version}`);
}

console.log("compliance migration complete");
