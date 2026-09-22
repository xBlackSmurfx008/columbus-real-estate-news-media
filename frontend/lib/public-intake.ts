import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { IntakeError, consumeLimit, intakeHash, limitRequest, readIntakeJson, verifyChallenge, type IntakeSql } from './intake-security.ts';
import { sendEmail } from './email.ts';
import { CONSENT_COPY, CURRENT_POLICY_VERSIONS, FORM_VERSIONS } from './compliance/policy-versions.ts';

export type IntakeKind = 'lead' | 'contact' | 'subscribe' | 'member' | 'preferences';
const personas = ['fsbo_seller', 'investor_seller', 'capital_partner', 'renter', 'rental_listing', 'directory_listing', 'profile_claim'];
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
export function text(value: unknown, max = 200): string {
  if (typeof value !== 'string') return '';
  if (value.length > max) throw new IntakeError('A field exceeds its allowed length.');
  return value.trim();
}

export function normalizeIntake(kind: IntakeKind, body: Record<string, unknown>) {
  const email = text(body.email, 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new IntakeError('Enter a valid email address.');
  const name = text(body.name);
  if (!['subscribe','preferences'].includes(kind) && !name) throw new IntakeError('Enter your name.');
  if (kind !== 'preferences' && (kind === 'member' ? body.termsConsent !== true : body.consent !== true)) throw new IntakeError('Please check the permission box.');
  const persona = kind === 'lead' ? text(body.persona, 40) : '';
  if (kind === 'lead' && !personas.includes(persona)) throw new IntakeError('Unknown request type.');
  if (persona === 'capital_partner') throw new IntakeError('Capital inquiries are not currently available.', 403);
  const pipeline = ['fsbo_seller', 'investor_seller'].includes(persona) ? 'acquisition' : 'media';
  const acquisitionEntity = process.env.CREN_ACQUISITION_ENTITY_NAME?.trim();
  if (pipeline === 'acquisition' && (process.env.CREN_ACQUISITION_INTAKE_ENABLED !== 'true' || !acquisitionEntity || body.acquisitionConsent !== true || body.acquisitionEntity !== acquisitionEntity)) {
    throw new IntakeError('The separately disclosed acquisition service is not available or its permission is missing.', 403);
  }
  const message = text(body.message, 5000);
  if (kind === 'contact' && !message) throw new IntakeError('Enter a message.');
  const password = kind === 'member' && typeof body.password === 'string' ? body.password : '';
  if (kind === 'member' && (password.length < 10 || Buffer.byteLength(password) > 72)) throw new IntakeError('Use a password of at least 10 characters and at most 72 bytes.');
  const details: Record<string, string> = {};
  if (body.details && typeof body.details === 'object' && !Array.isArray(body.details)) {
    const entries = Object.entries(body.details);
    if (entries.length > 12) throw new IntakeError('Too many detail fields.');
    for (const [key, value] of entries) {
      if (!/^[a-zA-Z][a-zA-Z0-9_ -]{0,59}$/.test(key) || !['string','number','boolean'].includes(typeof value)) throw new IntakeError('Invalid detail field.');
      details[key] = text(String(value), 1000);
    }
  }
  const consentCopy = kind === 'member' ? CONSENT_COPY.memberTerms : kind === 'subscribe' ? CONSENT_COPY.emailMarketing
    : kind === 'lead' ? (persona === 'profile_claim' ? CONSENT_COPY.profileClaim : CONSENT_COPY.leadRouting)
    : body.inquiry_type === 'advertising' ? CONSENT_COPY.advertiserTerms : CONSENT_COPY.contactPermission;
  const consent = { inquiryResponse: kind === 'lead' || kind === 'contact', newsletter: kind === 'subscribe' || (kind === 'member' && body.emailConsent === true), acquisition: pipeline === 'acquisition', terms: kind === 'member', version: '2026-09-22',
    copy: consentCopy, policyVersions: CURRENT_POLICY_VERSIONS,
    formVersion: kind === 'member' ? FORM_VERSIONS.join : kind === 'subscribe' ? FORM_VERSIONS.subscribe : kind === 'lead' ? FORM_VERSIONS.lead : body.inquiry_type === 'advertising' ? FORM_VERSIONS.advertisingInquiry : FORM_VERSIONS.contact,
    ...(kind === 'member' && body.emailConsent === true ? { newsletterCopy:CONSENT_COPY.emailMarketing } : {}),
    ...(pipeline === 'acquisition' ? { acquisitionCopy:`I request contact from ${acquisitionEntity}'s property-acquisition service about my property. This permission is separate from CREN's independent newsroom and newsletter services.` } : {}) };
  const payload = {
    name, persona, message, details, phone: text(body.phone, 40), area: text(body.area, 120),
    topic: text(body.topic, 500), interests: text(body.interests, 500), cadence: text(body.cadence, 80),
    company: kind === 'contact' ? text(body.company, 200) : '', packageInterest: text(body.package_interest, 120), budget: text(body.budget, 120),
    inquiryType: kind === 'contact' && body.inquiry_type === 'advertising' ? 'advertising' : 'general',
    // Attribution is descriptive, never routing, test status, brand, or pipeline authority.
    source: `website:${kind}`, sourceRoute: text(body.sourceRoute, 500),
    acquisitionEntity: pipeline === 'acquisition' ? acquisitionEntity : null,
  };
  return { kind, email, pipeline, consent, payload, password };
}

export async function stagePublicIntake(request: Request, kind: IntakeKind, sql: IntakeSql,
  dependencies = { sendEmail, verifyChallenge }) {
  const body = await readIntakeJson(request);
  await limitRequest(sql, request, `intake-${kind}`, typeof body.email === 'string' ? body.email.trim().toLowerCase() : '');
  const data = normalizeIntake(kind, body);
  const honeypot = typeof body.website_url === 'string' && body.website_url.trim().length > 0;
  const generic = { ok: true, pendingVerification: true, message: 'Check your email to confirm. No request or subscription is active before confirmation.' };
  if (honeypot) return generic; // Do not send confirmation mail for trapped submissions.
  await dependencies.verifyChallenge(body.turnstileToken, `intake-${kind}`);
  const origin = process.env.INTAKE_PUBLIC_ORIGIN;
  if (!origin || new URL(origin).protocol !== 'https:') throw new IntakeError('Intake is temporarily unavailable.', 503);
  const [suppressed] = await sql.query('SELECT email FROM subscriber_suppressions WHERE email=$1', [data.email]);
  if ((kind === 'subscribe' || kind === 'member') && suppressed && kind === 'subscribe') return generic;
  if (kind === 'preferences') {
    const [existing] = await sql.query('SELECT id FROM subscribers WHERE lower(email)=$1 LIMIT 1',[data.email]);
    if (!existing) return generic;
  }
  // A preference-link request grants no subscription consent; resend is capped at 3/hour.
  const dedupe = intakeHash(JSON.stringify([kind, data.email, kind === 'member' ? null : data.payload,
    kind === 'preferences' ? randomUUID() : new Date().toISOString().slice(0, 10)]));
  const id = randomUUID(); const token = randomBytes(32).toString('hex');
  await consumeLimit(sql, 'confirmation-email', data.email, 3, 3600);
  await consumeLimit(sql, 'confirmation-global', 'all', 100, 3600);
  const payload = { ...data.payload, ...(kind === 'member' ? { passwordHash: await bcrypt.hash(data.password, 12) } : {}) };
  const rows = await sql.query(`INSERT INTO public_intake
    (id,kind,pipeline,email,payload,consent,dedupe_key,token_hash,expires_at)
    VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,NOW()+interval '30 minutes')
    ON CONFLICT (dedupe_key) DO UPDATE SET token_hash=EXCLUDED.token_hash, expires_at=EXCLUDED.expires_at,
      delivery_status='PENDING',payload=EXCLUDED.payload,consent=EXCLUDED.consent
    WHERE public_intake.status='PENDING' AND (public_intake.delivery_status='FAILED' OR public_intake.expires_at<NOW()) RETURNING id`,
    [id,kind,data.pipeline,data.email,JSON.stringify(payload),JSON.stringify(data.consent),dedupe,tokenHash(token)]);
  if (!rows.length) return generic;
  const confirmation = new URL('/confirm-intake', origin); confirmation.hash = token;
  const delivery = await dependencies.sendEmail({ to: data.email, subject: 'Confirm your CREN request',
    text: `Someone submitted a ${kind === 'preferences' ? 'newsletter preference access request' : kind === 'subscribe' ? 'newsletter signup' : kind === 'member' ? 'member signup' : 'request'} using this address.\n\nIf that was you, open this link and press Confirm within 30 minutes:\n${confirmation}\n\nIf you did not request this, ignore this email. Nothing is added to a sales queue or newsletter before confirmation. This link does not grant marketing or acquisition permission beyond your submitted choices.` });
  await sql.query('UPDATE public_intake SET delivery_status=$2,delivery_id=$3 WHERE id=$1', [rows[0].id, delivery.ok && delivery.id ? 'ACCEPTED' : 'FAILED', delivery.id || null]);
  if (!delivery.ok || !delivery.id) throw new IntakeError('Confirmation could not be sent. Please try again later.', 503);
  return generic;
}

// This is one atomic statement: token replay cannot create a second legacy row.
// Legacy sales queues see only VERIFIED rows; pending personal data stays isolated.
export function promotionStatement(kind: IntakeKind) {
  const insert = kind === 'preferences' ? `SELECT s.id,s.email FROM subscribers s JOIN claimed ON lower(s.email)=claimed.email LIMIT 1`
    : kind === 'lead' ? `INSERT INTO leads (persona,name,email,phone,area,details,source,status,consent,is_test)
    SELECT payload->>'persona',payload->>'name',email,payload->>'phone',payload->>'area',payload->'details',
      'website:verified:'||pipeline,'new',true,false FROM claimed RETURNING id,email`
    : kind === 'contact' ? `INSERT INTO contacts (name,email,message,source,status,is_test)
    SELECT payload->>'name',email,concat_ws(E'\\n',NULLIF(payload->>'company',''),payload->>'message'),
      CASE WHEN payload->>'inquiryType'='advertising' THEN 'advertise:verified' ELSE 'contact:verified' END,'new',false FROM claimed RETURNING id,email`
    : kind === 'member' ? `INSERT INTO members (email,name,interests,password_hash,tier,status,is_test)
    SELECT email,payload->>'name',payload->>'interests',payload->>'passwordHash','free','active',false FROM claimed
    WHERE NOT EXISTS (SELECT 1 FROM members m WHERE lower(m.email)=claimed.email)
    ON CONFLICT (email) DO NOTHING RETURNING id,email`
    : `INSERT INTO subscribers (email,area,topic,source,status,is_test)
    SELECT email,payload->>'area',payload->>'topic','website:verified','active',false FROM claimed
    WHERE NOT EXISTS (SELECT 1 FROM subscriber_suppressions s WHERE s.email=claimed.email)
    AND NOT EXISTS (SELECT 1 FROM subscribers s WHERE lower(s.email)=claimed.email)
    ON CONFLICT (email) DO NOTHING RETURNING id,email`;
  const created = kind === 'subscribe' ? `written AS (${insert}), created AS (
    SELECT id,email FROM written UNION ALL
    SELECT s.id,lower(s.email) FROM subscribers s JOIN claimed ON lower(s.email)=claimed.email
    WHERE s.status='active' AND NOT EXISTS (SELECT 1 FROM subscriber_suppressions x WHERE x.email=claimed.email)
      AND NOT EXISTS (SELECT 1 FROM written)
  )` : `created AS (${insert})`;
  const memberNewsletter = kind === 'member' ? `, newsletter AS (
    INSERT INTO subscribers (email,area,topic,source,status,is_test)
    SELECT claimed.email,payload->>'area',payload->>'interests','website:verified:member','active',false
    FROM claimed JOIN created ON created.email=claimed.email
    WHERE (claimed.consent->>'newsletter')::boolean=true
      AND NOT EXISTS (SELECT 1 FROM subscriber_suppressions s WHERE s.email=claimed.email)
      AND NOT EXISTS (SELECT 1 FROM subscribers s WHERE lower(s.email)=claimed.email)
    ON CONFLICT (email) DO NOTHING RETURNING id
  )` : '';
  return `WITH claimed AS MATERIALIZED (
    SELECT * FROM public_intake
    WHERE token_hash=$1 AND status='PENDING' AND expires_at>NOW() AND kind=$2 FOR UPDATE
  ), ${created}${memberNewsletter}
  UPDATE public_intake p SET status=CASE WHEN created.id IS NULL THEN 'QUARANTINED' ELSE 'VERIFIED' END,
    verified_at=NOW(), source_id=created.id::text,
    payload=p.payload-'passwordHash'
  FROM claimed LEFT JOIN created ON created.email=claimed.email
  WHERE p.id=claimed.id RETURNING p.id,p.source_id,p.email,p.kind,p.pipeline,p.status`;
}
