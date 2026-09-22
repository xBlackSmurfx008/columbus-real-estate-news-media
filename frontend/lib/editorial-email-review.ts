import { createHash, randomBytes } from 'node:crypto';
import { evaluateArticle } from '../scripts/editorial-quality-lib.mjs';
import { mergePublicationCandidate, normalizeFactCheckedAt } from './publication-candidate.ts';
import { type EmailDelivery, type OutboundEmail, emailFromAddress } from './email.ts';
import { isDurableArticleImageUrl } from './article-image.ts';

export type EditorialEmailStatus =
  | 'SENDING'
  | 'AWAITING_REPLY'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'SUPERSEDED'
  | 'DELIVERY_FAILED';

export interface EditorialCandidate {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  date: string;
  category: string;
  image_url: string;
  image_alt?: string | null;
  image_caption?: string | null;
  meta_description?: string | null;
  area_slug?: string | null;
  topic_slug?: string | null;
  tags?: string[];
  [key: string]: unknown;
}

export type EditorialSql = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>) & {
  transaction?: unknown;
};
type Sql = EditorialSql;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function escapeHtml(value: unknown): string {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderInline(value: string): string {
  return escapeHtml(value).replace(
    /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
    '<a href="$2" style="color:#b91c1c;text-decoration:underline">$1</a>',
  );
}

function renderBody(body: string): string {
  return body.split(/\n\s*\n/).filter(Boolean).map((block) => {
    const heading = block.match(/^#{2,3}\s+(.+)$/);
    if (heading) return `<h2 style="font-size:22px;line-height:1.3;margin:28px 0 8px">${renderInline(heading[1])}</h2>`;
    return `<p style="font-size:16px;line-height:1.7;margin:0 0 18px">${renderInline(block).replaceAll('\n', '<br>')}</p>`;
  }).join('');
}

function plainBody(body: string): string {
  return body.replace(/^#{2,3}\s+/gm, '').trim();
}

export function editorialCandidateHash(candidate: EditorialCandidate): string {
  // Hash the entire publication artifact, including evidence, prompt version,
  // provenance and freshly fetched image bytes. Ignore operational timestamps.
  const ignored = new Set(['status', 'featured', 'created_at', 'updated_at', 'article_status', 'review_status']);
  const stable = (value: unknown): unknown => value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.map(stable)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, stable(entry)]))
      : value;
  const exact = Object.fromEntries(Object.entries(candidate).filter(([key]) => !ignored.has(key)));
  if (exact.read_time != null) exact.read_time = String(exact.read_time);
  if (Object.hasOwn(exact, 'fact_checked_at')) exact.fact_checked_at = normalizeFactCheckedAt(exact.fact_checked_at);
  return createHash('sha256').update(JSON.stringify(stable(exact))).digest('hex');
}

export async function editorialImageHash(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (!isDurableArticleImageUrl(url)) throw new Error('DURABLE_IMAGE_REQUIRED');
  const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('IMAGE_UNREACHABLE');
  if (Number(response.headers.get('content-length')) > 25_000_000) throw new Error('IMAGE_TOO_LARGE');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('IMAGE_EMPTY');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.length;
    if (length > 25_000_000) { await reader.cancel(); throw new Error('IMAGE_TOO_LARGE'); }
    chunks.push(part.value);
  }
  const bytes = Buffer.concat(chunks);
  const { default: sharp } = await import('sharp');
  await sharp(bytes).metadata();
  return createHash('sha256').update(bytes).digest('hex');
}

export function normalizeEmailAddress(value: string): string {
  const bracketed = value.match(/<([^<>]+)>/);
  return (bracketed?.[1] ?? value).trim().toLowerCase();
}

export function extractReplyText(value: string): string {
  const lines = value.replaceAll('\r\n', '\n').split('\n');
  const kept: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^\s*>/.test(line)) break;
    if (/^\s*On\s+/i.test(line)) {
      // Gmail can fold its date/sender header across multiple physical lines.
      // Stop only at a bounded contiguous header with date/address evidence.
      const folded: string[] = [];
      for (const continuation of lines.slice(index, index + 6)) {
        if (!continuation.trim()) break;
        folded.push(continuation.trim());
        if (/wrote:\s*$/i.test(continuation)) break;
      }
      const header = folded.join(' ');
      if (header.length <= 1500 && /wrote:\s*$/i.test(header)
        && /@|\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\b\d{4}\b/i.test(header)) break;
    }
    if (/^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i.test(line)) break;
    if (/^\s*From:\s+.+@.+$/i.test(line) && kept.some((item) => item.trim())) break;
    kept.push(line);
  }
  return kept.join('\n').trim().slice(0, 20_000);
}

/** Interpret only a small, contact-only signature grammar; keep its text for audit. */
function isConservativeSignature(lines: string[]): boolean {
  const footer = lines.map((line) => line.trim()).filter(Boolean);
  if (!footer.length) return true;
  if (footer.length > 16 || footer.join('\n').length > 1500) return false;
  const mobile = /^(?:Sent from my (?:iPhone|iPad|Android(?: device)?)|Sent from Outlook for (?:iOS|Android))[.!]?$/i;
  if (footer.length === 1 && mobile.test(footer[0])) return true;
  if (!/^(?:--|Best(?: regards)?|Kind regards|Regards|Sincerely|Thanks|Thank you|Cheers)[,!]?$/i.test(footer[0])) return false;
  const possibleInstruction = /\b(?:please|change|changes|edit|edits|correct|correction|corrections|fix|remove|add|replace|revise|use|make|need|needs|not|unless|after|before|but|except|pending|however|headline|title|paragraph|wording|copy|body|numbers?|sources?)\b/i;
  const name = /^[\p{Lu}][\p{L}'’.-]*(?:\s+[\p{Lu}][\p{L}'’.-]*){0,3}$/u;
  const role = /^(?:Founder(?: x\d+)?|Co-Founder|CEO|COO|CTO|CFO|President|Owner|Managing Partner|Chief (?:Executive|Operating|Technology|Financial) Officer)(?:\s*(?:&|\/|,)\s*(?:Founder|CEO|COO|CTO|CFO|President|Owner))*$/i;
  if (footer.length < 2 || !name.test(footer[1]) || possibleInstruction.test(footer[1])) return false;
  return footer.slice(2).every((line) => {
    // Plain-text contact links are recognized, never rendered or fetched here.
    const link = line.match(/^([\p{L}\p{N} .&'’-]{1,60})\s*<https?:\/\/[^\s<>]+>$/u);
    if (link) return !possibleInstruction.test(link[1]);
    if (possibleInstruction.test(line)) return false;
    return role.test(line) || mobile.test(line)
      || /^https?:\/\/[^\s<>]+$/.test(line)
      || /^(?:Email:\s*)?[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(line)
      || /^(?:(?:Tel|Phone|Mobile):\s*)?\+?[\d ()-]{7,25}(?:\s*(?:ext\.?|x)\s*\d{1,6})?$/i.test(line);
  });
}

export function classifyEditorialReply(value: string): {
  decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'EMPTY';
  reply: string;
} {
  const reply = extractReplyText(value);
  if (!reply) return { decision: 'EMPTY', reply };
  const [command, ...footer] = reply.split('\n');
  // Classification alone is not authority: verified sender and exact-proof gates follow.
  // Do not infer intent from an instruction hidden beyond the storage limit.
  if (reply.length < 20_000 && /^APPROV(?:E|ED)(?: THIS VERSION)?[.!]?$/i.test(command.trim())
    && isConservativeSignature(footer)) return { decision: 'APPROVED', reply };
  return { decision: 'CHANGES_REQUESTED', reply };
}

export async function ensureEditorialEmailReviewTable(sql: Sql) {
  const [schema] = await sql`SELECT to_regclass('editorial_email_events') AS events, to_regclass('editorial_correction_jobs') AS jobs,
    to_regclass('editorial_email_owner_confirmations') AS owner_confirmations,
    to_regclass('editorial_email_publications') AS publications, to_regclass('editorial_email_publication_checks') AS publication_checks,
    to_regclass('editorial_publication_fence') AS publication_fence`;
  if (!schema?.events || !schema?.jobs || !schema?.owner_confirmations || !schema?.publications || !schema?.publication_checks || !schema?.publication_fence) throw new Error('EDITORIAL_EMAIL_MIGRATION_REQUIRED');
}

export async function loadEditorialCandidate(sql: Sql, articleId: string): Promise<EditorialCandidate> {
  const [row] = await sql`
    SELECT
      articles.id, articles.title, articles.excerpt, articles.body, articles.author, articles.date,
      articles.category, articles.image_url, articles.image_alt, articles.image_caption, articles.read_time, articles.fact_checked_at,
      articles.meta_description, articles.area_slug, articles.topic_slug, articles.tags,
      articles.status AS article_status, editorial_review_jobs.status AS review_status,
      editorial_review_jobs.submission
    FROM articles
    JOIN editorial_review_jobs ON editorial_review_jobs.article_id = articles.id
    WHERE articles.id = ${articleId}
  `;
  if (!row) throw new Error('ARTICLE_NOT_FOUND');
  if (row.article_status !== 'draft') throw new Error('ARTICLE_NOT_DRAFT');
  if (row.review_status !== 'READY_FOR_REVIEW') throw new Error(`ARTICLE_NOT_READY:${String(row.review_status ?? 'missing')}`);
  if (!row.submission || typeof row.submission !== 'object') throw new Error('STAGED_SUBMISSION_MISSING');

  const persisted = { ...row };
  delete persisted.submission;
  delete persisted.article_status;
  delete persisted.review_status;
  const merged = mergePublicationCandidate(row.submission as Record<string, unknown>, persisted);
  const candidate = {
    ...merged,
    id: String(row.id),
    image_caption: row.image_caption ?? (merged.image_provenance as { caption?: string } | undefined)?.caption ?? null,
  } as EditorialCandidate;
  const report = evaluateArticle(candidate);
  if (!report.passed) throw new Error(`EDITORIAL_GATE_FAILED:${report.failedCodes.join(',')}`);
  if (!candidate.image_url || !candidate.image_url.startsWith('https://')) throw new Error('DURABLE_IMAGE_REQUIRED');
  candidate.image_sha256 = await editorialImageHash(candidate.image_url);
  return candidate;
}

export function buildEditorialReviewEmail(candidate: EditorialCandidate, version: number) {
  const subject = `[CREN REVIEW v${version}] ${candidate.title}`;
  const instruction = 'Reply with your edits in plain language. After corrections, you will receive a new proof to review. When this exact version is ready, reply APPROVE or APPROVED. Your email approval publishes this exact copy and hero automatically after sender verification, security, article and image checks pass. If any check fails, the story stays a draft. No separate image approval is needed; the image desk handles selection and quality checks.';
  const textMessage = [
    `CREN publication proof — version ${version}`,
    '',
    instruction,
    '',
    `TITLE: ${candidate.title}`,
    `DECK: ${candidate.excerpt}`,
    `BYLINE: ${candidate.author}`,
    `DATE: ${candidate.date}`,
    `HERO: ${candidate.image_url}`,
    `ALT: ${candidate.image_alt ?? ''}`,
    `CAPTION: ${candidate.image_caption ?? ''}`,
    '',
    plainBody(candidate.body),
    '',
    'OWNER APPROVAL: Your approval applies only to this exact proof version, copy and hero.',
    'Reply APPROVE or APPROVED only when this version is ready to publish. Edits, silence or approval of an earlier proof do not authorize publication.',
    'If sender verification, security, article or image checks fail, the story stays a draft.',
  ].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;color:#111827;font-family:Arial,sans-serif"><div style="max-width:760px;margin:0 auto;padding:28px 18px"><div style="background:#7f1d1d;color:white;padding:18px 22px;border-radius:12px 12px 0 0"><strong>CREN publication proof — version ${version}</strong></div><div style="background:white;padding:24px;border:1px solid #e5e7eb"><p style="font-size:16px;line-height:1.6;background:#fff7ed;border:1px solid #fdba74;padding:14px;border-radius:8px">${escapeHtml(instruction)}</p><img src="${escapeHtml(candidate.image_url)}" alt="${escapeHtml(candidate.image_alt ?? candidate.title)}" style="display:block;width:100%;height:auto;margin:24px 0 10px;border-radius:10px"><p style="font-size:13px;color:#6b7280">${escapeHtml(candidate.image_caption ?? candidate.image_alt ?? '')}</p><h1 style="font-size:34px;line-height:1.15;margin:24px 0 10px">${escapeHtml(candidate.title)}</h1><p style="font-size:19px;line-height:1.5;color:#4b5563">${escapeHtml(candidate.excerpt)}</p><p style="font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:12px">${escapeHtml(candidate.author)} · ${escapeHtml(candidate.date)}</p><div style="margin-top:28px">${renderBody(candidate.body)}</div><div style="margin-top:28px;padding:16px;background:#f9fafb;border:1px solid #d1d5db;border-radius:8px"><strong>Owner approval applies only to this proof</strong><p style="margin:8px 0 0;line-height:1.5">Reply <strong>APPROVE</strong> or <strong>APPROVED</strong> only when this exact version, copy and hero are ready to publish. Edits, silence or approval of an earlier proof do not authorize publication. If sender verification, security, article or image checks fail, the story stays a draft.</p></div></div></div></body></html>`;
  return { subject, text: textMessage, html };
}

/** Idempotency is bound to a durable proof version, not to a worker attempt. */
export async function sendEditorialProofMessage(message: OutboundEmail, key: string, fetchImpl: typeof fetch = fetch): Promise<EmailDelivery> {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'EMAIL_NOT_CONFIGURED' };
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15_000),
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ from: emailFromAddress(), to: [message.to], subject: message.subject, text: message.text, html: message.html, reply_to: message.replyTo }),
    });
    const body = await response.json() as { id?: string };
    return response.ok && body.id ? { ok: true, id: body.id } : { ok: false, error: 'EMAIL_REJECTED' };
  } catch { return { ok: false, error: 'EMAIL_DELIVERY_FAILED' }; }
}

export async function sendEditorialReviewEmail(sql: Sql, articleId: string, dependencies: {
  load?: (sql: Sql, id: string) => Promise<EditorialCandidate>;
  send?: (message: OutboundEmail, key: string) => Promise<EmailDelivery>;
} = {}): Promise<{ version: number; recipient: string; replyAddress: string; delivery: EmailDelivery }> {
  await ensureEditorialEmailReviewTable(sql);
  const recipient = normalizeEmailAddress(process.env.CREN_EDITOR_REVIEW_EMAIL ?? '');
  const domain = process.env.CREN_EDITOR_REVIEW_DOMAIN?.trim().toLowerCase();
  if (!recipient || !domain || !/^[a-z0-9.-]+$/.test(domain)) throw new Error('EDITORIAL_EMAIL_CONFIG_REQUIRED');
  const candidate = await (dependencies.load ?? loadEditorialCandidate)(sql, articleId);
  const hash = editorialCandidateHash(candidate);
  const token = randomBytes(18).toString('hex');
  const [reserved] = await sql`
    WITH previous AS MATERIALIZED (
      SELECT * FROM editorial_email_reviews WHERE article_id = ${articleId} ORDER BY version DESC LIMIT 1 FOR UPDATE
    ), reserved AS (
    INSERT INTO editorial_email_reviews
      (article_id, version, review_token, status, recipient_email, reply_address, candidate_hash, candidate, proposed_human_scores)
    SELECT ${articleId}, COALESCE(MAX(version), 0) + 1, ${token}, 'SENDING',
      ${recipient}, ${`editorial+${token}@${domain}`}, ${hash}, ${JSON.stringify(candidate)}::jsonb, '{}'::jsonb
    FROM editorial_email_reviews WHERE article_id = ${articleId}
    HAVING NOT EXISTS (
      SELECT 1 FROM editorial_email_reviews WHERE article_id = ${articleId}
        AND (status = 'SENDING' OR (candidate_hash = ${hash} AND status <> 'SUPERSEDED'))
    )
    AND NOT EXISTS (SELECT 1 FROM editorial_correction_jobs WHERE article_id = ${articleId} AND status IN ('QUEUED','RUNNING','BLOCKED'))
    AND NOT EXISTS (SELECT 1 FROM editorial_email_events e LEFT JOIN editorial_email_event_actions a ON a.email_id = e.email_id
      WHERE e.article_id = ${articleId} AND e.decision = 'CHANGES_REQUESTED' AND a.email_id IS NULL
        AND e.version = (SELECT MAX(version) FROM editorial_email_reviews WHERE article_id = ${articleId}))
    AND (SELECT COUNT(*) FROM previous) >= 0
    AND NOT EXISTS (SELECT 1 FROM previous WHERE status = 'PUBLISHED')
    ON CONFLICT DO NOTHING RETURNING *
    ), fenced AS (
      UPDATE editorial_email_reviews SET updated_at = clock_timestamp()
      WHERE article_id = ${articleId} AND version IN (SELECT version FROM previous) AND EXISTS (SELECT 1 FROM reserved)
    ) SELECT * FROM reserved
  `;
  const [existing] = reserved ? [] : await sql`
    SELECT * FROM editorial_email_reviews WHERE article_id = ${articleId} ORDER BY version DESC LIMIT 1
  `;
  const proof = reserved ?? existing;
  if (!proof || proof.candidate_hash !== hash) throw new Error('PROOF_ALREADY_IN_FLIGHT_OR_CANDIDATE_CHANGED');
  const version = Number(proof.version);
  if (proof.status === 'AWAITING_REPLY' || proof.status === 'APPROVED' || proof.status === 'PUBLISHED') {
    return { version, recipient, replyAddress: String(proof.reply_address), delivery: { ok: true, id: String(proof.outbound_email_id) } };
  }
  if (proof.status !== 'SENDING') throw new Error('NEW_CORRECTED_CANDIDATE_REQUIRED');
  // Resend keys expire after 24 hours. Never blindly resend an ambiguous older send.
  if (Date.now() - new Date(String(proof.created_at)).getTime() > 23 * 60 * 60 * 1000) throw new Error('PROOF_DELIVERY_RECONCILIATION_REQUIRED');
  const delivery = await (dependencies.send ?? sendEditorialProofMessage)(
    { ...buildEditorialReviewEmail(candidate, version), to: String(proof.recipient_email), replyTo: String(proof.reply_address) },
    `cren-proof/${articleId}/${version}`,
  );
  if (delivery.ok) {
    await sql`
      WITH sent AS (
        UPDATE editorial_email_reviews SET status = CASE WHEN status = 'SENDING' THEN 'AWAITING_REPLY' ELSE status END, outbound_email_id = ${delivery.id},
          sent_at = NOW(), updated_at = NOW()
        WHERE article_id = ${articleId} AND version = ${version} AND status IN ('SENDING','CHANGES_REQUESTED')
        RETURNING article_id, version
      )
      UPDATE editorial_email_reviews r SET status = 'SUPERSEDED', updated_at = NOW()
      FROM sent WHERE r.article_id = sent.article_id AND r.version < sent.version
        AND r.status NOT IN ('PUBLISHED', 'SUPERSEDED')
    `;
  }
  // Ambiguous transport errors retain SENDING and the same provider key.
  return { version, recipient: String(proof.recipient_email), replyAddress: String(proof.reply_address), delivery };
}
