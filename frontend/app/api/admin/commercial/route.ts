import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type JsonRow = Record<string, unknown>;

function isMissingTableError(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === "42P01" || /does not exist/i.test(candidate?.message ?? "");
}

async function safeRows(query: () => Promise<JsonRow[]>) {
  try {
    return await query();
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

function countByStatus(rows: JsonRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const status = typeof row.status === "string" ? row.status : "unknown";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 100, 1), 500);
    const sql = getDb();

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
      safeRows(() => sql`
        SELECT id, display_name, legal_name, category, status, verification_label, paid_status,
               website_url, public_email, public_phone, service_areas, last_verified_at,
               source_lead_id, created_at, updated_at
        FROM business_profiles ORDER BY updated_at DESC LIMIT ${limit}
      `),
      safeRows(() => sql`
        SELECT id, property_name, legal_owner, property_manager, address, area_slug, unit_count,
               rent_min, rent_max, availability_source, paid_status, last_verified_at,
               status, source_lead_id, created_at, updated_at
        FROM apartment_profiles ORDER BY updated_at DESC LIMIT ${limit}
      `),
      safeRows(() => sql`
        SELECT id, profile_type, profile_id, claimant_name, claimant_role, claimant_email,
               authority_type, proof_summary, status, reviewer_id, review_notes, decided_at,
               created_at, updated_at
        FROM profile_claims ORDER BY created_at DESC LIMIT ${limit}
      `),
      safeRows(() => sql`
        SELECT id, profile_type, profile_id, reporter_name, reporter_email, issue_type,
               evidence, status, public_note, private_note, reviewer_id, created_at, updated_at
        FROM profile_disputes ORDER BY created_at DESC LIMIT ${limit}
      `),
      safeRows(() => sql`
        SELECT id, display_name, legal_name, category, billing_contact_name, billing_email,
               campaign_contact_name, campaign_email, phone, website_url, status,
               source_contact_id, created_at, updated_at
        FROM advertiser_accounts ORDER BY updated_at DESC LIMIT ${limit}
      `),
      safeRows(() => sql`
        SELECT id, advertiser_account_id, package_key, placement, label, status,
               start_date, end_date, goals, utm_source, utm_campaign, terms_version,
               sponsor_policy_version, source_contact_id, created_at, updated_at
        FROM campaigns ORDER BY updated_at DESC LIMIT ${limit}
      `),
      safeRows(() => sql`
        SELECT id, campaign_id, asset_type, headline, body, cta_text, cta_url,
               image_url, alt_text, rights_acknowledged_at, review_status, reviewer_id,
               created_at, updated_at
        FROM ad_assets ORDER BY updated_at DESC LIMIT ${limit}
      `),
      safeRows(() => sql`
        SELECT id, entity_type, entity_id, claim_text, claim_type, source_url,
               status, reviewer_id, created_at, updated_at
        FROM claim_substantiation ORDER BY created_at DESC LIMIT ${limit}
      `),
      safeRows(() => sql`
        SELECT id, advertiser_account_id, campaign_id, terms_version, price_cents,
               currency, payment_terms, accepted_by_name, accepted_by_email, accepted_at,
               status, created_at, updated_at
        FROM insertion_orders ORDER BY updated_at DESC LIMIT ${limit}
      `),
      safeRows(() => sql`
        SELECT id, lead_id, route_rule, actor, recipient_category, reason, status, created_at
        FROM lead_routes ORDER BY created_at DESC LIMIT ${limit}
      `),
      safeRows(() => sql`
        SELECT id, lead_id, recipient_type, recipient_id, recipient_category,
               compensation_category, disclosure_version, sent_at, response_status,
               created_at, updated_at
        FROM lead_recipients ORDER BY created_at DESC LIMIT ${limit}
      `),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      counts: {
        businessProfiles: businessProfiles.length,
        apartmentProfiles: apartmentProfiles.length,
        profileClaims: profileClaims.length,
        openProfileClaims: profileClaims.filter((row) => row.status !== "approved" && row.status !== "rejected").length,
        profileDisputes: profileDisputes.length,
        advertiserAccounts: advertiserAccounts.length,
        campaigns: campaigns.length,
        campaignAssetsPendingReview: adAssets.filter((row) => row.review_status !== "approved" && row.review_status !== "rejected").length,
        claimSubstantiationNeeded: claimSubstantiation.filter((row) => row.status !== "approved" && row.status !== "rejected").length,
        insertionOrders: insertionOrders.length,
        leadRoutes: leadRoutes.length,
        leadRecipients: leadRecipients.length,
      },
      statusBreakdowns: {
        businessProfiles: countByStatus(businessProfiles),
        apartmentProfiles: countByStatus(apartmentProfiles),
        profileClaims: countByStatus(profileClaims),
        profileDisputes: countByStatus(profileDisputes),
        advertiserAccounts: countByStatus(advertiserAccounts),
        campaigns: countByStatus(campaigns),
        insertionOrders: countByStatus(insertionOrders),
        leadRoutes: countByStatus(leadRoutes),
      },
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
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
