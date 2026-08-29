type SqlClient = {
  query: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
};

type LeadIntakeInput = {
  leadId: string | number;
  persona: string;
  name: string;
  email: string;
  phone?: string | null;
  area?: string | null;
  details: Record<string, unknown>;
};

type AdvertisingIntakeInput = {
  contactId: string | number;
  name: string;
  email: string;
  company?: string | null;
  packageInterest?: string | null;
  budget?: string | null;
  message?: string | null;
};

function clean(value: unknown, max = 500) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : null;
}

function slugify(value: unknown, fallback: string) {
  const source = clean(value, 120) ?? fallback;
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || fallback;
}

function isMissingIntakeTableError(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === "42P01" || /does not exist/i.test(candidate?.message ?? "");
}

async function createDirectoryProfileIntake(sql: SqlClient, input: LeadIntakeInput) {
  const leadId = String(input.leadId);
  const profileSlug = `${slugify(input.details.business_name, "business")}-${leadId}`;
  const rows = await sql.query(
    `
      INSERT INTO business_profiles (
        slug, display_name, legal_name, category, status, verification_label,
        description, service_areas, website_url, public_phone, source_lead_id, details
      )
      VALUES ($1, $2, $3, $4, 'claimed_pending', 'basic_listing', $5, $6, $7, $8, $9, $10::jsonb)
      RETURNING id
    `,
    [
      profileSlug,
      clean(input.details.business_name, 200) ?? input.name,
      clean(input.details.legal_entity_name, 200),
      clean(input.details.category, 120),
      clean(input.details.listing_summary, 2000),
      clean(input.details.service_areas, 2000) ?? input.area,
      clean(input.details.website, 500),
      clean(input.details.public_contact, 200),
      leadId,
      JSON.stringify(input.details),
    ],
  );
  const profileId = String(rows[0]?.id ?? "");
  if (!profileId) return null;

  await sql.query(
    `
      INSERT INTO profile_claims (
        profile_type, profile_id, claimant_name, claimant_email, claimant_phone,
        claimant_role, authority_type, proof_summary, status
      )
      VALUES ('business_profile', $1, $2, $3, $4, $5, 'submitted_authority_statement', $6, 'submitted')
    `,
    [
      profileId,
      input.name,
      input.email,
      input.phone,
      clean(input.details.claimant_authority, 300),
      clean(input.details.claimant_authority, 2000),
    ],
  );

  await sql.query(
    `
      INSERT INTO profile_versions (
        profile_type, profile_id, actor_type, actor_id, change_reason, after_json, review_status
      )
      VALUES ('business_profile', $1, 'lead_intake', $2, 'directory listing submission', $3::jsonb, 'pending_review')
    `,
    [profileId, leadId, JSON.stringify(input.details)],
  );

  return { profileType: "business_profile", profileId };
}

async function createApartmentProfileIntake(sql: SqlClient, input: LeadIntakeInput) {
  const leadId = String(input.leadId);
  const details = input.details;
  const profileName = clean(details.property_name, 200) ?? `${clean(details.property_type, 80) ?? "Rental"} in ${input.area ?? "Columbus"}`;
  const profileSlug = `${slugify(profileName, "rental")}-${leadId}`;
  const rows = await sql.query(
    `
      INSERT INTO apartment_profiles (
        slug, property_name, area_slug, availability_source, fees,
        source_lead_id, details, status
      )
      VALUES ($1, $2, $3, 'cren_public_rental_listing_request', $4, $5, $6::jsonb, 'claimed_pending')
      RETURNING id
    `,
    [
      profileSlug,
      profileName,
      clean(input.area, 120),
      clean(details.monthly_price, 500),
      leadId,
      JSON.stringify(details),
    ],
  );
  const profileId = String(rows[0]?.id ?? "");
  if (!profileId) return null;

  await sql.query(
    `
      INSERT INTO profile_claims (
        profile_type, profile_id, claimant_name, claimant_email, claimant_phone,
        claimant_role, authority_type, proof_summary, status
      )
      VALUES ('apartment_profile', $1, $2, $3, $4, 'rental submitter', 'submitted_listing_request', $5, 'submitted')
    `,
    [
      profileId,
      input.name,
      input.email,
      input.phone,
      clean(details.listing_details, 2000),
    ],
  );

  await sql.query(
    `
      INSERT INTO apartment_availability_snapshots (
        apartment_profile_id, concessions, source, confidence
      )
      VALUES ($1, $2, 'CREN rental listing request', 'submitted_unverified')
    `,
    [profileId, clean(details.availability, 500)],
  );

  return { profileType: "apartment_profile", profileId };
}

async function createProfileClaimIntake(sql: SqlClient, input: LeadIntakeInput) {
  const details = input.details;
  const rows = await sql.query(
    `
      INSERT INTO profile_claims (
        profile_type, profile_id, claimant_name, claimant_email, claimant_phone,
        claimant_role, authority_type, proof_summary, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'profile_owner_update_request', $7, 'submitted')
      RETURNING id
    `,
    [
      clean(details.profile_type, 120) ?? "unknown_profile",
      clean(details.existing_profile_id_or_url, 500),
      input.name,
      input.email,
      input.phone,
      clean(details.claimant_role, 200),
      [
        clean(details.authority_proof, 1200),
        clean(details.requested_updates, 1800),
        clean(details.dispute_or_risk_notes, 1200),
      ].filter(Boolean).join("\n\n"),
    ],
  );
  return { profileType: "profile_claim", profileId: String(rows[0]?.id ?? "") };
}

export async function mirrorLeadIntakeSafely(sql: SqlClient, input: LeadIntakeInput) {
  try {
    if (input.persona === "directory_listing") {
      return await createDirectoryProfileIntake(sql, input);
    }
    if (input.persona === "rental_listing") {
      return await createApartmentProfileIntake(sql, input);
    }
    if (input.persona === "profile_claim") {
      return await createProfileClaimIntake(sql, input);
    }
    return null;
  } catch (error) {
    if (isMissingIntakeTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function mirrorAdvertisingInquirySafely(sql: SqlClient, input: AdvertisingIntakeInput) {
  try {
    const company = clean(input.company, 200) ?? clean(input.name, 200) ?? "Advertising inquiry";
    const rows = await sql.query(
      `
        INSERT INTO advertiser_accounts (
          display_name, legal_name, billing_contact_name, billing_email,
          campaign_contact_name, campaign_email, status, source_contact_id
        )
        VALUES ($1, $2, $3, $4, $3, $4, 'inquiry', $5)
        RETURNING id
      `,
      [company, clean(input.company, 200), clean(input.name, 200), input.email, String(input.contactId)],
    );
    const advertiserAccountId = String(rows[0]?.id ?? "");
    if (!advertiserAccountId) return null;

    const campaign = await sql.query(
      `
        INSERT INTO campaigns (
          advertiser_account_id, package_key, label, status, goals,
          terms_version, sponsor_policy_version, source_contact_id
        )
        VALUES ($1, $2, 'Advertisement', 'inquiry', $3, '2026-08-29-local-1', '2026-08-29-local-1', $4)
        RETURNING id
      `,
      [
        advertiserAccountId,
        clean(input.packageInterest, 120),
        [clean(input.message, 2000), clean(input.budget, 200) ? `Budget: ${clean(input.budget, 200)}` : null].filter(Boolean).join("\n\n"),
        String(input.contactId),
      ],
    );
    const campaignId = String(campaign[0]?.id ?? "");
    if (campaignId) {
      await sql.query(
        `
          INSERT INTO ad_assets (
            campaign_id, asset_type, body, review_status
          )
          VALUES ($1, 'intake_note', $2, 'pending_review')
        `,
        [campaignId, clean(input.message, 2000)],
      );
    }
    return { advertiserAccountId, campaignId };
  } catch (error) {
    if (isMissingIntakeTableError(error)) {
      return null;
    }
    throw error;
  }
}
