import { createHash, randomBytes } from 'node:crypto';
import { evaluateArticle } from '../scripts/editorial-quality-lib.mjs';
import { mergePublicationCandidate } from './publication-candidate.ts';
import { sendEmail, type EmailDelivery } from './email.ts';
import { validateHumanReview } from './editorial-review.ts';

export const EDITORIAL_EMAIL_SCORECARD = Object.freeze({
  B1: 2, B2: 2, B3: 2, B4: 2, B5: 2,
  B6: 2, B7: 2, B8: 2, B9: 2, B10: 2,
});

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

type Sql = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>) & {
  transaction?: unknown;
};

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
  const exact = {
    id: candidate.id,
    title: candidate.title,
    excerpt: candidate.excerpt,
    body: candidate.body,
    author: candidate.author,
    date: candidate.date,
    category: candidate.category,
    image_url: candidate.image_url,
    image_alt: candidate.image_alt ?? null,
    image_caption: candidate.image_caption ?? null,
    meta_description: candidate.meta_description ?? null,
    area_slug: candidate.area_slug ?? null,
    topic_slug: candidate.topic_slug ?? null,
    tags: candidate.tags ?? [],
  };
  return createHash('sha256').update(JSON.stringify(exact)).digest('hex');
}

export function normalizeEmailAddress(value: string): string {
  const bracketed = value.match(/<([^<>]+)>/);
  return (bracketed?.[1] ?? value).trim().toLowerCase();
}

export function extractReplyText(value: string): string {
  const lines = value.replaceAll('\r\n', '\n').split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) break;
    if (/^\s*On .+wrote:\s*$/i.test(line)) break;
    if (/^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i.test(line)) break;
    if (/^\s*From:\s+.+@.+$/i.test(line) && kept.some((item) => item.trim())) break;
    kept.push(line);
  }
  return kept.join('\n').trim().slice(0, 20_000);
}

export function classifyEditorialReply(value: string): {
  decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'EMPTY';
  reply: string;
} {
  const reply = extractReplyText(value);
  if (!reply) return { decision: 'EMPTY', reply };
  if (/^APPROVE(?: THIS VERSION)?[.!]?$/i.test(reply)) return { decision: 'APPROVED', reply };
  return { decision: 'CHANGES_REQUESTED', reply };
}

export async function ensureEditorialEmailReviewTable(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS editorial_email_reviews (
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      review_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      reply_address TEXT NOT NULL,
      candidate_hash TEXT NOT NULL,
      candidate JSONB NOT NULL,
      proposed_human_scores JSONB NOT NULL,
      outbound_email_id TEXT,
      inbound_email_id TEXT UNIQUE,
      reply_from TEXT,
      reply_text TEXT,
      reviewer TEXT,
      sent_at TIMESTAMPTZ,
      replied_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (article_id, version),
      CONSTRAINT editorial_email_review_status_check CHECK (
        status IN ('SENDING', 'AWAITING_REPLY', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'DELIVERY_FAILED')
      )
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS editorial_email_reviews_status_idx ON editorial_email_reviews(status, updated_at DESC)`;
}

export async function loadEditorialCandidate(sql: Sql, articleId: string): Promise<EditorialCandidate> {
  const [row] = await sql`
    SELECT
      articles.id, articles.title, articles.excerpt, articles.body, articles.author, articles.date,
      articles.category, articles.image_url, articles.image_alt, articles.image_caption,
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
  return candidate;
}

export function buildEditorialReviewEmail(candidate: EditorialCandidate, version: number) {
  const scorecard = validateHumanReview(EDITORIAL_EMAIL_SCORECARD);
  const subject = `[CREN REVIEW v${version}] ${candidate.title}`;
  const instruction = 'Reply with your edits in plain language. After the corrected proof arrives, reply APPROVE to approve that exact version and the displayed 20/20 scorecard.';
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
    '',
    plainBody(candidate.body),
    '',
    `PROPOSED EDITORIAL SCORECARD: ${scorecard.total}/20 (2 in B1-B10)`,
    'Reply APPROVE only when this exact copy and hero are ready to publish.',
  ].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;color:#111827;font-family:Arial,sans-serif"><div style="max-width:760px;margin:0 auto;padding:28px 18px"><div style="background:#7f1d1d;color:white;padding:18px 22px;border-radius:12px 12px 0 0"><strong>CREN publication proof — version ${version}</strong></div><div style="background:white;padding:24px;border:1px solid #e5e7eb"><p style="font-size:16px;line-height:1.6;background:#fff7ed;border:1px solid #fdba74;padding:14px;border-radius:8px">${escapeHtml(instruction)}</p><img src="${escapeHtml(candidate.image_url)}" alt="${escapeHtml(candidate.image_alt ?? candidate.title)}" style="display:block;width:100%;height:auto;margin:24px 0 10px;border-radius:10px"><p style="font-size:13px;color:#6b7280">${escapeHtml(candidate.image_caption ?? candidate.image_alt ?? '')}</p><h1 style="font-size:34px;line-height:1.15;margin:24px 0 10px">${escapeHtml(candidate.title)}</h1><p style="font-size:19px;line-height:1.5;color:#4b5563">${escapeHtml(candidate.excerpt)}</p><p style="font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:12px">${escapeHtml(candidate.author)} · ${escapeHtml(candidate.date)}</p><div style="margin-top:28px">${renderBody(candidate.body)}</div><div style="margin-top:28px;padding:16px;background:#f9fafb;border:1px solid #d1d5db;border-radius:8px"><strong>Proposed editorial scorecard: ${scorecard.total}/20</strong><p style="margin:8px 0 0;line-height:1.5">B1-B10 are each scored 2. Reply <strong>APPROVE</strong> only when this exact copy, hero, and scorecard are ready to publish.</p></div></div></div></body></html>`;
  return { subject, text: textMessage, html };
}

export async function sendEditorialReviewEmail(sql: Sql, articleId: string): Promise<{
  version: number;
  recipient: string;
  replyAddress: string;
  delivery: EmailDelivery;
}> {
  await ensureEditorialEmailReviewTable(sql);
  const recipient = process.env.CREN_EDITOR_REVIEW_EMAIL?.trim();
  const receivingDomain = process.env.CREN_EDITOR_REVIEW_DOMAIN?.trim().toLowerCase();
  if (!recipient) throw new Error('CREN_EDITOR_REVIEW_EMAIL_NOT_CONFIGURED');
  if (!receivingDomain) throw new Error('CREN_EDITOR_REVIEW_DOMAIN_NOT_CONFIGURED');

  const candidate = await loadEditorialCandidate(sql, articleId);
  const candidateHash = editorialCandidateHash(candidate);
  const [versionRow] = await sql`SELECT COALESCE(MAX(version), 0)::int + 1 AS version FROM editorial_email_reviews WHERE article_id = ${articleId}`;
  const version = Number(versionRow?.version ?? 1);
  const reviewToken = randomBytes(18).toString('hex');
  const replyAddress = `editorial+${reviewToken}@${receivingDomain}`;

  await sql`
    UPDATE editorial_email_reviews SET status = 'SUPERSEDED', updated_at = NOW()
    WHERE article_id = ${articleId} AND status IN ('SENDING', 'AWAITING_REPLY', 'CHANGES_REQUESTED', 'APPROVED')
  `;
  await sql`
    INSERT INTO editorial_email_reviews (
      article_id, version, review_token, status, recipient_email, reply_address,
      candidate_hash, candidate, proposed_human_scores
    ) VALUES (
      ${articleId}, ${version}, ${reviewToken}, 'SENDING', ${recipient}, ${replyAddress},
      ${candidateHash}, ${JSON.stringify(candidate)}::jsonb, ${JSON.stringify(EDITORIAL_EMAIL_SCORECARD)}::jsonb
    )
  `;

  const message = buildEditorialReviewEmail(candidate, version);
  const delivery = await sendEmail({ ...message, to: recipient, replyTo: replyAddress });
  await sql`
    UPDATE editorial_email_reviews SET
      status = ${delivery.ok ? 'AWAITING_REPLY' : 'DELIVERY_FAILED'},
      outbound_email_id = ${delivery.id ?? null}, sent_at = ${delivery.ok ? new Date().toISOString() : null},
      updated_at = NOW()
    WHERE article_id = ${articleId} AND version = ${version}
  `;
  return { version, recipient, replyAddress, delivery };
}
