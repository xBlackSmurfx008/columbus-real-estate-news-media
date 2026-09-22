#!/usr/bin/env node
// Scoped, dry-run-first recovery of a real provider-authenticated approval receipt.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { processEditorialEmailPublication } from '../lib/editorial-email-publication.ts';
import { ensureEditorialEmailReviewTable } from '../lib/editorial-email-review.ts';

function arg(name) { return process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3); }
const emailId = arg('email-id');
const articleId = arg('article-id');
const apply = process.argv.includes('--apply');
const backupOnly = process.argv.includes('--backup-only');
if (!emailId || !articleId) throw new Error('EXACT_EMAIL_AND_ARTICLE_IDS_REQUIRED');
if (apply && arg('confirm') !== 'publish-approved-email') throw new Error('PUBLICATION_CONFIRMATION_REQUIRED');
if (arg('receiving-env-file')) {
  const receiver = parseEnv(await readFile(arg('receiving-env-file'), 'utf8'));
  process.env.RESEND_RECEIVING_API_KEY = receiver.RESEND_RECEIVING_API_KEY ?? receiver.RESEND_API_KEY;
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
const sql = neon(process.env.DATABASE_URL);
await ensureEditorialEmailReviewTable(sql);
const [event] = await sql`SELECT article_id FROM editorial_email_events WHERE email_id = ${emailId}`;
if (!event || event.article_id !== articleId) throw new Error('EXACT_EMAIL_ARTICLE_MISMATCH');
const preflight = await processEditorialEmailPublication(sql, emailId);
if ((!apply && !backupOnly) || preflight.alreadyPublished) {
  console.log(JSON.stringify({ ...preflight, applyRequested: apply }));
} else {
  // Private recovery snapshot excludes proof tokens and mailbox credential data.
  const article = await sql`SELECT * FROM articles WHERE id = ${articleId}`;
  const review = await sql`SELECT * FROM editorial_review_jobs WHERE article_id = ${articleId}`;
  const proofs = await sql`SELECT version,status,candidate_hash,reviewer,approved_at,published_at FROM editorial_email_reviews WHERE article_id = ${articleId}`;
  const images = await sql`SELECT * FROM article_image_jobs WHERE article_id = ${articleId}`;
  const fingerprints = await sql`SELECT * FROM article_image_fingerprints WHERE article_id = ${articleId}`;
  const jobs = await sql`SELECT * FROM editorial_correction_jobs WHERE email_id = ${emailId}`;
  const directory = resolve('var/editorial-publication');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const backup = resolve(directory, `${new Date().toISOString().replaceAll(':','-')}-${emailId}.json`);
  await writeFile(backup, JSON.stringify({ articleId,emailId,article,review,proofs,images,fingerprints,jobs }, null, 2), { mode: 0o600, flag: 'wx' });
  const result = apply ? await processEditorialEmailPublication(sql, emailId, { apply: true }) : preflight;
  console.log(JSON.stringify({ ...result, backup }));
}
