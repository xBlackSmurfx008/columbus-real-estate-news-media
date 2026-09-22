import { createHash, randomUUID } from 'node:crypto';
import { claimAgentJob, completeAgentJob, failAgentJob, type SqlClient } from '../src/agent/repositories/jobs.ts';

export type VerifiedIntake = {
  id: string; kind: string; pipeline: string; email: string; payload: Record<string, unknown>;
  consent: Record<string, unknown>; status: string; source_id: string | null; verified_at: string;
};
export type CrenCrmPayload = {
  sourceSystem: 'columbus-real-estate-news'; externalId: string; eventType: string; occurredAt: string;
  contact: { email: string; name?: string; phone?: string };
  lead?: { routeKey: string; source: string; title?: string; message?: string; persona?: string };
  metadata: { pipeline: 'media' | 'acquisition'; sourceId: string; consentVersion: string; marketingAllowed: boolean; verified: true };
};
const clean = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : undefined;

export function verifiedIntakeSummary(payload: Record<string, unknown>) {
  const details = payload.details && typeof payload.details === 'object'
    ? Object.entries(payload.details).slice(0, 12).map(([key, value]) => `${key}: ${String(value).slice(0, 1000)}`).join('\n') : clean(payload.details, 3000);
  return clean(payload.message, 3000) || clean(details, 3000);
}

export function buildVerifiedCrmPayload(row: VerifiedIntake): CrenCrmPayload {
  if (row.status !== 'VERIFIED' || !row.source_id || !row.verified_at) throw new Error('INTAKE_NOT_VERIFIED');
  if (!['lead', 'contact', 'subscribe'].includes(row.kind)) throw new Error('INTAKE_KIND_UNSUPPORTED');
  if (!['media', 'acquisition'].includes(row.pipeline)) throw new Error('PIPELINE_INVALID');
  const subscriber = row.kind === 'subscribe';
  if (subscriber && (row.pipeline !== 'media' || row.consent.newsletter !== true)) throw new Error('CONSENT_REQUIRED');
  if (!subscriber && row.consent.inquiryResponse !== true) throw new Error('CONSENT_REQUIRED');
  if (row.pipeline === 'acquisition' && row.consent.acquisition !== true) throw new Error('ACQUISITION_CONSENT_REQUIRED');
  const email = row.email.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_VERIFIED_EMAIL');
  // Scope comes only from the persisted verified ledger, never caller-provided metadata/persona.
  const persona = clean(row.payload.persona, 80);
  const routeKey = row.pipeline === 'acquisition' ? 'residential-intake'
    : row.payload.inquiryType === 'advertising' ? 'advertising-sales'
    : ['renter', 'rental_listing'].includes(persona ?? '') ? 'rental-apartment-intake'
    : ['directory_listing', 'profile_claim'].includes(persona ?? '') ? 'profile-verification' : 'development-desk';
  return {
    sourceSystem: 'columbus-real-estate-news', externalId: `intake:${row.id}`,
    eventType: subscriber ? 'newsletter_subscriber' : row.kind,
    occurredAt: new Date(row.verified_at).toISOString(),
    contact: { email, name: clean(row.payload.name, 200), phone: clean(row.payload.phone, 40) },
    ...(subscriber ? {} : { lead: { routeKey, source: 'verified-website-intake', title: clean(row.payload.subject, 240),
      message: verifiedIntakeSummary(row.payload), persona } }),
    metadata: { pipeline: row.pipeline as 'media' | 'acquisition', sourceId: row.source_id,
      consentVersion: clean(row.consent.version, 50) ?? 'unknown', marketingAllowed: row.consent.newsletter === true, verified: true },
  };
}

function payloadHash(payload: CrenCrmPayload) { return createHash('sha256').update(JSON.stringify(payload)).digest('hex'); }

/** The compatibility adapter is disabled until explicitly enabled. Acquisition is never routed to the media connector. */
export function crmConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const enabled = (env.CRM_SYNC_ENABLED ?? env.CREN_CRM_SYNC_ENABLED) === 'true';
  const secret = env.CRM_SYNC_SECRET ?? env.CREN_CRM_SYNC_SECRET;
  const url = env.CRM_SYNC_URL ?? env.CREN_CRM_SYNC_URL ?? 'https://crm.mradams.xyz/api/v1/inbound/cre-news';
  let validUrl = false;
  try {
    const parsed = new URL(url);
    validUrl = parsed.protocol === 'https:' && parsed.hostname === 'crm.mradams.xyz'
      && parsed.pathname === '/api/v1/inbound/cre-news' && !parsed.port && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch { /* invalid configuration remains disabled */ }
  return { enabled: enabled && Boolean(secret) && validUrl, url, secret,
    reason: !enabled ? 'CRM_DISABLED' : !secret ? 'CRM_SECRET_MISSING' : !validUrl ? 'CRM_URL_INVALID' : null };
}

export async function enqueueVerifiedIntakeCrm(sql: SqlClient, input: { intakeId: string; [key: string]: unknown }) {
  const rows = await sql`SELECT id, kind, pipeline, email, payload, consent, status, source_id, verified_at
    FROM public_intake WHERE id = ${input.intakeId} AND status = 'VERIFIED' AND source_id IS NOT NULL`;
  if (!rows[0]) throw new Error('INTAKE_NOT_VERIFIED');
  const payload = buildVerifiedCrmPayload(rows[0] as VerifiedIntake);
  const hash = payloadHash(payload);
  // Job + outbox are created in one statement; a crash cannot leave an untracked delivery job.
  const result = await sql`
    WITH job AS (
      INSERT INTO cren_agent_jobs (id, kind, dedupe_key, payload, owner_role)
      VALUES (${randomUUID()}, 'crm.deliver', ${payload.externalId}, ${JSON.stringify({ intakeId: input.intakeId })}::jsonb, ${payload.metadata.pipeline})
      ON CONFLICT (dedupe_key) DO UPDATE SET dedupe_key = EXCLUDED.dedupe_key RETURNING id
    ) INSERT INTO cren_crm_outbox (intake_id, event_key, pipeline, job_id, payload_hash)
      SELECT ${input.intakeId}, ${payload.externalId}, ${payload.metadata.pipeline}, id, ${hash} FROM job
      ON CONFLICT (intake_id) DO UPDATE SET intake_id = EXCLUDED.intake_id
      RETURNING event_key, status, payload_hash
  `;
  if (result[0]?.payload_hash !== hash) throw new Error('CRM_PAYLOAD_CONFLICT');
  return { eventKey: payload.externalId, status: String(result[0]?.status ?? 'QUEUED') };
}

export async function reconcileVerifiedCrmIntakes(sql: SqlClient, limit = 50) {
  const rows = await sql`SELECT i.id FROM public_intake i LEFT JOIN cren_crm_outbox o ON o.intake_id = i.id
    WHERE i.status = 'VERIFIED' AND i.source_id IS NOT NULL AND i.kind IN ('lead','contact','subscribe') AND o.intake_id IS NULL
      AND ((i.kind = 'subscribe' AND i.pipeline = 'media' AND i.consent->>'newsletter' = 'true')
        OR (i.kind IN ('lead','contact') AND i.consent->>'inquiryResponse' = 'true'
          AND (i.pipeline = 'media' OR (i.pipeline = 'acquisition' AND i.consent->>'acquisition' = 'true'))))
    ORDER BY i.verified_at, i.id LIMIT ${Math.max(1, Math.min(100, Math.floor(limit)))}`;
  let enqueued = 0;
  for (const row of rows) { await enqueueVerifiedIntakeCrm(sql, { intakeId: String(row.id) }); enqueued++; }
  return { enqueued };
}

export type CrmReceipt = { ok: true; externalId: string; duplicate?: true; contactId?: string; dealId?: string | null };
export function verifiedCrmReceipt(body: unknown, payload: CrenCrmPayload): CrmReceipt | null {
  if (!body || typeof body !== 'object') return null;
  const receipt = body as Record<string, unknown>;
  if (receipt.ok !== true || receipt.externalId !== payload.externalId) return null;
  if (receipt.duplicate !== true && (typeof receipt.contactId !== 'string' || !receipt.contactId.trim())) return null;
  // Receiver must not create a sales deal from a newsletter consent.
  if (payload.eventType === 'newsletter_subscriber' && receipt.dealId) return null;
  return { ok: true, externalId: payload.externalId, ...(receipt.duplicate === true ? { duplicate: true } : {}),
    ...(typeof receipt.contactId === 'string' ? { contactId: receipt.contactId.slice(0, 200) } : {}),
    ...(typeof receipt.dealId === 'string' ? { dealId: receipt.dealId.slice(0, 200) } : {}) };
}

export async function processCrmOutbox(sql: SqlClient, options: { limit?: number; fetcher?: typeof fetch; env?: NodeJS.ProcessEnv } = {}) {
  const config = crmConfiguration(options.env);
  if (!config.enabled) return { enabled: false, reason: config.reason, delivered: 0, failed: 0, blocked: 0 };
  let delivered = 0, failed = 0, blocked = 0;
  for (let index = 0; index < Math.min(10, options.limit ?? 5); index++) {
    const job = await claimAgentJob(sql, { kinds: ['crm.deliver'], leaseSeconds: 60 });
    if (!job) break;
    const token = String(job.lease_token);
    try {
      const rows = await sql`SELECT i.*, o.payload_hash, o.status AS outbox_status FROM public_intake i
        JOIN cren_crm_outbox o ON o.intake_id = i.id WHERE o.job_id = ${job.id}`;
      if (!rows[0]) throw new Error('CRM_INTAKE_MISSING');
      const row = rows[0];
      if (row.outbox_status === 'DELIVERED') { await completeAgentJob(sql, job.id, token, { recovered: true }); continue; }
      const payload = buildVerifiedCrmPayload(row as VerifiedIntake);
      if (payloadHash(payload) !== row.payload_hash) throw new Error('CRM_PAYLOAD_CONFLICT');
      if (payload.eventType === 'newsletter_subscriber') {
        const suppressed = await sql`SELECT email FROM subscriber_suppressions WHERE email = ${payload.contact.email} LIMIT 1`;
        if (suppressed[0]) throw new Error('NEWSLETTER_SUPPRESSED');
      }
      if (payload.metadata.pipeline === 'acquisition') {
        await sql`UPDATE cren_crm_outbox SET status = 'BLOCKED', last_error = 'ACQUISITION_RECEIVER_NOT_SEPARATED', updated_at = NOW() WHERE job_id = ${job.id}`;
        await failAgentJob(sql, job.id, token, 'ACQUISITION_RECEIVER_NOT_SEPARATED', false);
        blocked++; continue;
      }
      const response = await (options.fetcher ?? fetch)(config.url, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { Authorization: `Bearer ${config.secret}`, 'Content-Type': 'application/json', 'Idempotency-Key': payload.externalId },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        await failAgentJob(sql, job.id, token, `CRM_HTTP_${response.status}`, [408, 425, 429].includes(response.status) || response.status >= 500);
        failed++; continue;
      }
      const receipt = verifiedCrmReceipt(await response.json().catch(() => null), payload);
      if (!receipt) throw new Error('CRM_RECEIPT_INVALID');
      const written = await sql`UPDATE cren_crm_outbox SET status = 'DELIVERED', receiver_receipt = ${JSON.stringify(receipt)}::jsonb,
        delivered_at = NOW(), updated_at = NOW(), last_error = NULL
        WHERE job_id = ${job.id} AND EXISTS (SELECT 1 FROM cren_agent_jobs WHERE id = ${job.id}
          AND status = 'RUNNING' AND lease_token = ${token} AND lease_until > NOW()) RETURNING intake_id`;
      if (!written[0]) throw new Error('JOB_LEASE_LOST');
      await completeAgentJob(sql, job.id, token, { receipt });
      delivered++;
    } catch (error) {
      const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'CRM_TRANSPORT_FAILED';
      if (code === 'JOB_LEASE_LOST') throw error;
      await failAgentJob(sql, job.id, token, code, !['CONSENT_REQUIRED', 'INTAKE_NOT_VERIFIED', 'CRM_PAYLOAD_CONFLICT', 'ACQUISITION_CONSENT_REQUIRED', 'NEWSLETTER_SUPPRESSED'].includes(code));
      failed++;
    }
  }
  return { enabled: true, delivered, failed, blocked };
}
