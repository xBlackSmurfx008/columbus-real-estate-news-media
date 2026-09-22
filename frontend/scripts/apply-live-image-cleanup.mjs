#!/usr/bin/env node
// Owner-authorized image-only repair. Dry-run by default. Immutable uploads,
// whole-live-corpus visual fingerprints, exact state CAS, one fenced DB commit,
// audit_logs provenance receipts and a private rollback snapshot. Never changes
// copy/status or historical email approvals. Does not generate or purchase media.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { fingerprintArticleImageBytes, hammingDistance } from './article-image-policy.mjs';
import { reuseFingerprint, compareReuse } from './image-reuse-lib.mjs';
import { mapLimit } from './site-quality/http.mjs';
import { assertLiveImageCleanupPreflight, journalLiveImageUpload, commitLiveImageCleanup, verifyLiveImageCleanup } from './live-image-cleanup-store.mjs';

const arg = name => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const apply = process.argv.includes('--apply');
if (!arg('plan') || (apply && arg('confirm') !== 'image-only-cleanup')) throw new Error('--plan FILE [--apply --confirm image-only-cleanup]');
if (!process.env.DATABASE_URL || (apply && !process.env.BLOB_READ_WRITE_TOKEN)) throw new Error('PRIVATE_ENV_REQUIRED');
const plan = JSON.parse(await readFile(resolve(arg('plan')), 'utf8'));
if (!Array.isArray(plan) || !plan.length || new Set(plan.map(p => p.article_id)).size !== plan.length) throw new Error('INVALID_PLAN');
const sql = neon(process.env.DATABASE_URL);
const [fence] = await sql`SELECT generation::text AS generation FROM editorial_publication_fence WHERE id=1`;
if (!fence) throw new Error('PUBLICATION_FENCE_REQUIRED');
const articles = await sql`SELECT a.*,a.updated_at::text AS snapshot_updated_at FROM articles a WHERE a.status='live' ORDER BY a.id`;
if (articles.length !== plan.length || articles.some(a => !plan.some(p => p.article_id === a.id))) throw new Error('EXACT_WHOLE_LIVE_CORPUS_REQUIRED');
const [audit] = await sql`SELECT to_regclass('public.audit_logs') AS table_name`;
if (!audit.table_name) throw new Error('AUDIT_TABLE_REQUIRED');
const jobColumns = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='article_image_jobs'`;
if (['cloud_lease_token','claim_token','lease_expires_at','visual_review'].some(column => !jobColumns.some(row => row.column_name === column))) {
  throw new Error('IMAGE_JOB_RECONCILIATION_SCHEMA_REQUIRED');
}
const beforeFingerprints = await sql`SELECT * FROM article_image_fingerprints`;
const beforeJobs = await sql`SELECT * FROM article_image_jobs WHERE article_id = ANY(${articles.map(a => a.id)})`;
if (articles.some(a => beforeJobs.filter(j => j.article_id === a.id).length !== 1)) throw new Error('EVERY_TARGET_IMAGE_JOB_REQUIRED');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prepared = await mapLimit(articles, 4, async a => {
  const p = plan.find(p => p.article_id === a.id);
  if (p.expected_image_url !== a.image_url || !/^[a-f0-9]{64}$/.test(p.expected_sha256)) throw new Error(`IMAGE_SNAPSHOT_CHANGED:${a.id}`);
  if (typeof p.image_alt !== 'string' || p.image_alt.length < 40 || p.image_alt.length > 200
    || !p.image_caption || /placeholder pending|should replace this before publication/i.test(p.image_caption)) throw new Error(`IMAGE_METADATA_INVALID:${a.id}`);
  // Re-fetch exact current bytes; a stale database fingerprint is never evidence.
  const current = await fetch(a.image_url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!current.ok || !current.headers.get('content-type')?.startsWith('image/')) throw new Error(`CURRENT_IMAGE_UNREACHABLE:${a.id}`);
  const chunks = []; let length = 0;
  for await (const chunk of current.body) { length += chunk.length; if (length > 25_000_000) throw new Error('IMAGE_TOO_LARGE'); chunks.push(chunk); }
  const priorBytes = Buffer.concat(chunks);
  if (hash(priorBytes) !== p.expected_sha256) throw new Error(`CURRENT_IMAGE_BYTES_CHANGED:${a.id}`);
  const bytes = p.file ? await readFile(resolve(p.file)) : priorBytes;
  if (p.file) {
    const meta = await sharp(bytes).metadata();
    if (meta.width !== 1600 || meta.height !== 900 || meta.format !== 'webp') throw new Error(`REVIEWED_FINAL_WEBP_REQUIRED:${a.id}`);
    const review = p.visual_review;
    if (!review || review.sha256 !== hash(bytes) || !review.reviewed_by || !Number.isFinite(Date.parse(review.reviewed_at))
      || !['natural_appearance','story_context','no_synthetic_artifacts','mobile_crop'].every(k => review[k] === true)) throw new Error(`FINAL_PIXEL_REVIEW_REQUIRED:${a.id}`);
    if (p.provenance?.type !== 'LICENSED_PHOTO' || !p.provenance.source || !p.provenance.license || !p.provenance.credit
      || !p.image_caption.includes(p.provenance.credit) || !p.image_caption.includes(p.provenance.source)) throw new Error(`PHOTO_RIGHTS_CAPTION_REQUIRED:${a.id}`);
  }
  const fingerprint = await fingerprintArticleImageBytes(bytes);
  if (!fingerprint) throw new Error(`IMAGE_FINGERPRINT_FAILED:${a.id}`);
  return { id: a.id, image_url: a.image_url, image_alt: p.image_alt, image_caption: p.image_caption,
    snapshot_updated_at: a.snapshot_updated_at, before: a, provenance: p.provenance, review: p.visual_review,
    replacement: Boolean(p.file), bytes, fingerprint, reuse: await reuseFingerprint(bytes) };
});
for (let i = 0; i < prepared.length; i++) for (let j = i + 1; j < prepared.length; j++) {
  const match = compareReuse(prepared[i].reuse, prepared[j].reuse);
  if (match) throw new Error(`DUPLICATE_OR_SIMILAR_IMAGE:${prepared[i].id}:${prepared[j].id}:${match.kind}`);
}
const others = beforeFingerprints.filter(f => !prepared.some(p => p.id === f.article_id));
for (const p of prepared) for (const f of others) {
  if (f.sha256 === p.fingerprint.sha256 || (/^[a-f0-9]{16}$/.test(f.perceptual_hash ?? '') && hammingDistance(f.perceptual_hash, p.fingerprint.perceptualHash) <= 10)) throw new Error(`OTHER_ARTICLE_IMAGE_COLLISION:${p.id}`);
}
assertLiveImageCleanupPreflight({ records: prepared.map(p => ({ id: p.id, sha256: p.fingerprint.sha256,
  perceptual_hash: p.fingerprint.perceptualHash })), fingerprints: beforeFingerprints, jobs: beforeJobs });
const summary = { ok: true, dryRun: !apply, articles: prepared.length, replacements: prepared.filter(p => p.replacement).length,
  metadataChanges: prepared.filter(p => p.image_alt !== p.before.image_alt || p.image_caption !== p.before.image_caption).length,
  staleFingerprints: beforeFingerprints.filter(f => prepared.some(p => p.id === f.article_id && p.before.image_url !== f.image_url)).length,
  copyChanges: 0, duplicateCandidates: 0 };
if (!apply) { console.log(JSON.stringify(summary, null, 2)); process.exit(0); }
const batch = randomUUID();
const backupPath = resolve('var/cren-images/repairs', `${batch}-before.json`);
await mkdir(dirname(backupPath), { recursive: true });
await writeFile(backupPath, JSON.stringify({ batch, createdAt: new Date().toISOString(), articles, fingerprints: beforeFingerprints, imageJobs: beforeJobs }, null, 2), { mode: 0o600, flag: 'wx' });
const uploadJournalPath = backupPath.replace('-before.json', '-uploads.jsonl');
await writeFile(uploadJournalPath, '', { mode: 0o600, flag: 'wx' });
for (const p of prepared.filter(p => p.replacement)) {
  const blob = await put(`cren/articles/${p.id}/photo-${p.fingerprint.sha256.slice(0,16)}.webp`, p.bytes, {
    access: 'public', addRandomSuffix: true, allowOverwrite: false, contentType: 'image/webp', cacheControlMaxAge: 31536000,
  });
  // The receipt is flushed before the next operation can fail. Never retry or
  // delete an uploaded asset blindly when readback/commit subsequently fails.
  await journalLiveImageUpload(uploadJournalPath, { batch, article_id: p.id, image_url: blob.url,
    pathname: blob.pathname, sha256: p.fingerprint.sha256, uploaded_at: new Date().toISOString() });
  p.image_url = blob.url;
  const delivery = await fetch(blob.url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!delivery.ok || hash(Buffer.from(await delivery.arrayBuffer())) !== p.fingerprint.sha256) throw new Error(`UPLOADED_BYTES_MISMATCH:${p.id}`);
}
const records = prepared.map(p => ({ id: p.id, expected_url: p.before.image_url, snapshot_updated_at: p.snapshot_updated_at,
  image_url: p.image_url, image_alt: p.image_alt, image_caption: p.image_caption,
  sha256: p.fingerprint.sha256, perceptual_hash: p.fingerprint.perceptualHash, replacement: p.replacement,
  before_image: { image_url: p.before.image_url, image_alt: p.before.image_alt, image_caption: p.before.image_caption },
  provenance: p.provenance ?? null, visual_review: p.review ?? null }));
// Keep the exact upload receipt even if the fenced commit aborts. Do not delete
// uploaded blobs or retry a conflicting batch blindly.
await writeFile(backupPath.replace('-before.json','-planned.json'), JSON.stringify({ batch, records }, null, 2), { mode: 0o600, flag: 'wx' });
const result = await commitLiveImageCleanup(sql, { records, generation: fence.generation, batch });
const verification = await verifyLiveImageCleanup(sql, { records, articles, beforeJobs, batch });
console.log(JSON.stringify({ ...summary, batch, backupPath, uploadJournalPath, applied: result.changed, ...verification }, null, 2));
