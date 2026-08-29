#!/usr/bin/env node
// Exports the managed-sales commercial queues for advertiser wrap reporting.
// Default output masks obvious PII; pass --include-pii only for private operator use.
// Usage: DATABASE_URL=... node scripts/export-commercial-report.mjs [--out path] [--limit 100] [--include-pii]

import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const limitIdx = args.indexOf("--limit");
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
const limit = Math.min(Math.max(limitIdx >= 0 ? Number(args[limitIdx + 1]) || 100 : 100, 1), 500);
const includePii = args.includes("--include-pii");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

function isMissingTableError(error) {
  return error?.code === "42P01" || /does not exist/i.test(error?.message ?? "");
}

function maskEmail(value) {
  const [user, domain] = String(value).split("@");
  if (!domain) return "[masked]";
  return `${user.slice(0, 2)}***@${domain}`;
}

function maskPhone(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 4 ? `***-***-${digits.slice(-4)}` : "[masked]";
}

function maskRow(row) {
  if (includePii) return row;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (value == null) return [key, value];
    if (/email/i.test(key)) return [key, maskEmail(value)];
    if (/phone/i.test(key)) return [key, maskPhone(value)];
    if (/name/i.test(key) && !/display|legal|campaign/i.test(key)) return [key, "[masked]"];
    return [key, value];
  }));
}

async function rows(table, columns, orderBy = "updated_at") {
  try {
    const data = await sql.query(
      `SELECT ${columns.join(", ")} FROM ${table} ORDER BY ${orderBy} DESC LIMIT $1`,
      [limit],
    );
    return data.map(maskRow);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function count(table) {
  try {
    const data = await sql.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
    return data[0]?.n ?? 0;
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

const [
  businessProfiles,
  apartmentProfiles,
  profileClaims,
  profileDisputes,
  advertiserAccounts,
  campaigns,
  adAssets,
  claimSubstantiation,
  insertionOrders,
  leadRoutes,
  leadRecipients,
] = await Promise.all([
  rows("business_profiles", ["id", "display_name", "legal_name", "category", "status", "verification_label", "paid_status", "last_verified_at", "updated_at"]),
  rows("apartment_profiles", ["id", "property_name", "property_manager", "area_slug", "rent_min", "rent_max", "availability_source", "paid_status", "last_verified_at", "status", "updated_at"]),
  rows("profile_claims", ["id", "profile_type", "profile_id", "claimant_name", "claimant_role", "claimant_email", "authority_type", "status", "created_at"], "created_at"),
  rows("profile_disputes", ["id", "profile_type", "profile_id", "reporter_name", "reporter_email", "issue_type", "status", "created_at"], "created_at"),
  rows("advertiser_accounts", ["id", "display_name", "legal_name", "category", "campaign_email", "status", "source_contact_id", "updated_at"]),
  rows("campaigns", ["id", "advertiser_account_id", "package_key", "placement", "label", "status", "start_date", "end_date", "terms_version", "sponsor_policy_version", "source_contact_id", "updated_at"]),
  rows("ad_assets", ["id", "campaign_id", "asset_type", "headline", "cta_url", "review_status", "created_at"]),
  rows("claim_substantiation", ["id", "entity_type", "entity_id", "claim_text", "claim_type", "source_url", "status", "created_at"], "created_at"),
  rows("insertion_orders", ["id", "advertiser_account_id", "campaign_id", "terms_version", "price_cents", "currency", "status", "accepted_at", "updated_at"]),
  rows("lead_routes", ["id", "lead_id", "route_rule", "actor", "recipient_category", "reason", "status", "created_at"], "created_at"),
  rows("lead_recipients", ["id", "lead_id", "recipient_type", "recipient_id", "recipient_category", "compensation_category", "response_status", "sent_at", "created_at"], "created_at"),
]);

const counts = Object.fromEntries(await Promise.all([
  "business_profiles",
  "apartment_profiles",
  "profile_claims",
  "profile_disputes",
  "advertiser_accounts",
  "campaigns",
  "ad_assets",
  "claim_substantiation",
  "insertion_orders",
  "lead_routes",
  "lead_recipients",
].map(async (table) => [table, await count(table)])));

const report = {
  reportType: "CREN commercial operations export",
  generatedAt: new Date().toISOString(),
  limit,
  piiIncluded: includePii,
  counts,
  businessProfiles,
  apartmentProfiles,
  profileClaims,
  profileDisputes,
  advertiserAccounts,
  campaigns,
  adAssets,
  claimSubstantiation,
  insertionOrders,
  leadRoutes,
  leadRecipients,
};

const output = `${JSON.stringify(report, null, 2)}\n`;
if (outPath) {
  const target = path.resolve(outPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output);
  console.error(`wrote ${target}`);
} else {
  process.stdout.write(output);
}
