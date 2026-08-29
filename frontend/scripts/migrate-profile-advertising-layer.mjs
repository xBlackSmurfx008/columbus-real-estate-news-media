#!/usr/bin/env node
// Idempotent migration for profile, apartment, advertiser, campaign, lead-routing,
// substantiation, insertion-order, and audit-log tables.
// Usage: DATABASE_URL=... node scripts/migrate-profile-advertising-layer.mjs

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function indexExists(name) {
  const rows = await sql`
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = ${name}
  `;
  return rows.length > 0;
}

async function ensureTable(name, ddl) {
  await sql.query(ddl);
  console.log(`ensured: table ${name}`);
}

async function ensureIndex(name, ddl) {
  if (await indexExists(name)) {
    console.log(`skip: index ${name} exists`);
    return;
  }
  await sql.query(ddl);
  console.log(`created: index ${name}`);
}

await ensureTable(
  "business_profiles",
  `CREATE TABLE IF NOT EXISTS business_profiles (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT UNIQUE,
    display_name TEXT NOT NULL,
    legal_name TEXT,
    category TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    verification_label TEXT NOT NULL DEFAULT 'basic_listing',
    description TEXT,
    service_areas TEXT,
    website_url TEXT,
    public_email TEXT,
    public_phone TEXT,
    address TEXT,
    owner_member_id TEXT,
    paid_status TEXT NOT NULL DEFAULT 'free',
    source_lead_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "apartment_profiles",
  `CREATE TABLE IF NOT EXISTS apartment_profiles (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT UNIQUE,
    property_name TEXT,
    legal_owner TEXT,
    property_manager TEXT,
    address TEXT,
    area_slug TEXT,
    parcel_id TEXT,
    unit_count INT,
    unit_mix JSONB NOT NULL DEFAULT '{}'::jsonb,
    rent_min NUMERIC,
    rent_max NUMERIC,
    fees TEXT,
    concessions TEXT,
    pet_policy TEXT,
    parking_policy TEXT,
    accessibility_features TEXT,
    amenities TEXT,
    tour_url TEXT,
    apply_url TEXT,
    availability_source TEXT,
    paid_status TEXT NOT NULL DEFAULT 'free',
    fair_housing_certified_at TIMESTAMPTZ,
    source_lead_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_verified_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "apartment_availability_snapshots",
  `CREATE TABLE IF NOT EXISTS apartment_availability_snapshots (
    id BIGSERIAL PRIMARY KEY,
    apartment_profile_id TEXT NOT NULL,
    units JSONB NOT NULL DEFAULT '[]'::jsonb,
    rent_min NUMERIC,
    rent_max NUMERIC,
    concessions TEXT,
    source TEXT,
    source_url TEXT,
    confidence TEXT NOT NULL DEFAULT 'submitted_unverified',
    valid_through DATE,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "profile_claims",
  `CREATE TABLE IF NOT EXISTS profile_claims (
    id BIGSERIAL PRIMARY KEY,
    profile_type TEXT NOT NULL,
    profile_id TEXT,
    claimant_member_id TEXT,
    claimant_name TEXT,
    claimant_role TEXT,
    claimant_email TEXT,
    claimant_phone TEXT,
    authority_type TEXT,
    proof_summary TEXT,
    proof_private_path TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    reviewer_id TEXT,
    review_notes TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "profile_versions",
  `CREATE TABLE IF NOT EXISTS profile_versions (
    id BIGSERIAL PRIMARY KEY,
    profile_type TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    actor_type TEXT NOT NULL DEFAULT 'system',
    actor_id TEXT,
    change_reason TEXT,
    before_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    after_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    review_status TEXT NOT NULL DEFAULT 'pending_review',
    reviewer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "profile_credentials",
  `CREATE TABLE IF NOT EXISTS profile_credentials (
    id BIGSERIAL PRIMARY KEY,
    profile_type TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    credential_type TEXT,
    credential_name TEXT,
    credential_identifier TEXT,
    issuing_authority TEXT,
    source_url TEXT,
    proof_private_path TEXT,
    expires_at DATE,
    verification_status TEXT NOT NULL DEFAULT 'submitted',
    reviewer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "profile_disputes",
  `CREATE TABLE IF NOT EXISTS profile_disputes (
    id BIGSERIAL PRIMARY KEY,
    profile_type TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    reporter_name TEXT,
    reporter_email TEXT,
    issue_type TEXT NOT NULL,
    evidence TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    public_note TEXT,
    private_note TEXT,
    reviewer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "advertiser_accounts",
  `CREATE TABLE IF NOT EXISTS advertiser_accounts (
    id BIGSERIAL PRIMARY KEY,
    legal_name TEXT,
    display_name TEXT NOT NULL,
    category TEXT,
    billing_contact_name TEXT,
    billing_email TEXT,
    campaign_contact_name TEXT,
    campaign_email TEXT,
    phone TEXT,
    website_url TEXT,
    status TEXT NOT NULL DEFAULT 'inquiry',
    risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_contact_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "campaigns",
  `CREATE TABLE IF NOT EXISTS campaigns (
    id BIGSERIAL PRIMARY KEY,
    advertiser_account_id TEXT,
    package_key TEXT,
    placement TEXT,
    label TEXT NOT NULL DEFAULT 'Advertisement',
    status TEXT NOT NULL DEFAULT 'inquiry',
    start_date DATE,
    end_date DATE,
    goals TEXT,
    utm_source TEXT,
    utm_campaign TEXT,
    terms_version TEXT,
    sponsor_policy_version TEXT,
    source_contact_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "ad_assets",
  `CREATE TABLE IF NOT EXISTS ad_assets (
    id BIGSERIAL PRIMARY KEY,
    campaign_id TEXT,
    asset_type TEXT NOT NULL DEFAULT 'copy',
    headline TEXT,
    body TEXT,
    cta_text TEXT,
    cta_url TEXT,
    image_url TEXT,
    alt_text TEXT,
    rights_acknowledged_at TIMESTAMPTZ,
    review_status TEXT NOT NULL DEFAULT 'pending_review',
    reviewer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "claim_substantiation",
  `CREATE TABLE IF NOT EXISTS claim_substantiation (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    claim_text TEXT NOT NULL,
    claim_type TEXT,
    source_url TEXT,
    proof_private_path TEXT,
    status TEXT NOT NULL DEFAULT 'needed',
    reviewer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "insertion_orders",
  `CREATE TABLE IF NOT EXISTS insertion_orders (
    id BIGSERIAL PRIMARY KEY,
    advertiser_account_id TEXT,
    campaign_id TEXT,
    terms_version TEXT,
    price_cents INT,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_terms TEXT,
    deliverables JSONB NOT NULL DEFAULT '{}'::jsonb,
    cancellation_terms TEXT,
    refund_make_good_terms TEXT,
    accepted_by_name TEXT,
    accepted_by_email TEXT,
    accepted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "lead_recipients",
  `CREATE TABLE IF NOT EXISTS lead_recipients (
    id BIGSERIAL PRIMARY KEY,
    lead_id TEXT NOT NULL,
    recipient_type TEXT,
    recipient_id TEXT,
    recipient_category TEXT,
    compensation_category TEXT,
    disclosure_version TEXT,
    sent_at TIMESTAMPTZ,
    response_status TEXT NOT NULL DEFAULT 'not_sent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "lead_routes",
  `CREATE TABLE IF NOT EXISTS lead_routes (
    id BIGSERIAL PRIMARY KEY,
    lead_id TEXT NOT NULL,
    route_rule TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'system',
    recipient_category TEXT,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'queued_for_review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

await ensureTable(
  "audit_logs",
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_type TEXT NOT NULL DEFAULT 'system',
    actor_id TEXT,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    action TEXT NOT NULL,
    source_route TEXT,
    before_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    after_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
);

for (const [name, ddl] of [
  ["business_profiles_status_idx", "CREATE INDEX business_profiles_status_idx ON business_profiles(status, updated_at DESC)"],
  ["business_profiles_category_idx", "CREATE INDEX business_profiles_category_idx ON business_profiles(category, status)"],
  ["apartment_profiles_status_idx", "CREATE INDEX apartment_profiles_status_idx ON apartment_profiles(status, updated_at DESC)"],
  ["profile_claims_status_idx", "CREATE INDEX profile_claims_status_idx ON profile_claims(status, created_at DESC)"],
  ["profile_versions_profile_idx", "CREATE INDEX profile_versions_profile_idx ON profile_versions(profile_type, profile_id, created_at DESC)"],
  ["profile_disputes_status_idx", "CREATE INDEX profile_disputes_status_idx ON profile_disputes(status, created_at DESC)"],
  ["advertiser_accounts_status_idx", "CREATE INDEX advertiser_accounts_status_idx ON advertiser_accounts(status, updated_at DESC)"],
  ["campaigns_status_idx", "CREATE INDEX campaigns_status_idx ON campaigns(status, start_date DESC NULLS LAST)"],
  ["ad_assets_campaign_idx", "CREATE INDEX ad_assets_campaign_idx ON ad_assets(campaign_id, review_status)"],
  ["claim_substantiation_status_idx", "CREATE INDEX claim_substantiation_status_idx ON claim_substantiation(status, created_at DESC)"],
  ["lead_recipients_lead_idx", "CREATE INDEX lead_recipients_lead_idx ON lead_recipients(lead_id, created_at DESC)"],
  ["lead_routes_lead_idx", "CREATE INDEX lead_routes_lead_idx ON lead_routes(lead_id, created_at DESC)"],
  ["audit_logs_entity_idx", "CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id, created_at DESC)"],
]) {
  await ensureIndex(name, ddl);
}

console.log("profile and advertising migration complete");
