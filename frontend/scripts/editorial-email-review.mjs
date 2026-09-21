#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import {
  ensureEditorialEmailReviewTable,
  sendEditorialReviewEmail,
} from '../lib/editorial-email-review.ts';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const command = process.argv[2];
const articleId = arg('article-id');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
if (!articleId) throw new Error('ARTICLE_ID_REQUIRED');
if (!['status', 'send'].includes(command)) {
  throw new Error('Usage: editorial-email-review.mjs <status|send> --article-id <id> [--confirm send-editorial-proof]');
}

const sql = neon(process.env.DATABASE_URL);
await ensureEditorialEmailReviewTable(sql);
if (command === 'send') {
  if (arg('confirm') !== 'send-editorial-proof') throw new Error('SEND_CONFIRMATION_REQUIRED');
  const result = await sendEditorialReviewEmail(sql, articleId);
  process.stdout.write(`${JSON.stringify({
    ok: result.delivery.ok,
    articleId,
    version: result.version,
    recipient: result.recipient,
    status: result.delivery.ok ? 'AWAITING_REPLY' : 'DELIVERY_FAILED',
    deliveryId: result.delivery.id ?? null,
    error: result.delivery.error ?? null,
  })}\n`);
} else {
  const [review] = await sql`
    SELECT article_id, version, status, recipient_email, reply_text, reviewer,
      sent_at, replied_at, approved_at, published_at, updated_at
    FROM editorial_email_reviews
    WHERE article_id = ${articleId}
    ORDER BY version DESC
    LIMIT 1
  `;
  process.stdout.write(`${JSON.stringify({ ok: true, review: review ?? null })}\n`);
}
