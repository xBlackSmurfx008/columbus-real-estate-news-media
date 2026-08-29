import { CONSENT_COPY, getPolicyVersionSnapshot, type ConsentCopyKey, type ConsentType } from "@/lib/compliance/policy-versions";

type SqlClient = {
  query: (query: string, params?: unknown[]) => Promise<unknown>;
};

export type ConsentEventInput = {
  consentKey: ConsentCopyKey;
  actorType?: string;
  actorId?: string | number | null;
  entityType: string;
  entityId?: string | number | null;
  email?: string | null;
  phone?: string | null;
  sourceRoute?: string | null;
  formId: string;
  formVersion: string;
  recipientCategory?: string | null;
  compensationDisclosureCategory?: string | null;
  policyVersions?: Record<string, string> | Partial<Record<string, string>>;
};

function asNullableString(value: unknown, max = 500) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}

function isMissingConsentTableError(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === "42P01" || /consent_events/i.test(candidate?.message ?? "") && /does not exist/i.test(candidate?.message ?? "");
}

export async function recordConsentEvent(sql: SqlClient, input: ConsentEventInput) {
  const consent = CONSENT_COPY[input.consentKey];
  const policyVersions = input.policyVersions ?? getPolicyVersionSnapshot();
  await sql.query(
    `
      INSERT INTO consent_events (
        actor_type, actor_id, entity_type, entity_id, email, phone,
        consent_type, consent_version, consent_text, policy_versions,
        source_route, form_id, form_version, recipient_category,
        compensation_disclosure_category
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15)
    `,
    [
      asNullableString(input.actorType, 80) ?? "anonymous",
      asNullableString(input.actorId, 120),
      asNullableString(input.entityType, 120),
      asNullableString(input.entityId, 120),
      asNullableString(input.email, 320),
      asNullableString(input.phone, 80),
      consent.type satisfies ConsentType,
      consent.version,
      consent.text,
      JSON.stringify(policyVersions),
      asNullableString(input.sourceRoute, 500),
      asNullableString(input.formId, 120),
      asNullableString(input.formVersion, 120),
      asNullableString(input.recipientCategory, 120),
      asNullableString(input.compensationDisclosureCategory, 120),
    ],
  );
}

export async function recordConsentEventSafely(sql: SqlClient, input: ConsentEventInput) {
  try {
    await recordConsentEvent(sql, input);
    return { ok: true, skipped: false };
  } catch (error) {
    if (isMissingConsentTableError(error)) {
      return { ok: false, skipped: true, reason: "CONSENT_EVENTS_TABLE_MISSING" };
    }
    throw error;
  }
}
