#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { IMAGE_MODEL, safeErrorSummary } from './image-pipeline-lib.mjs';
import { getSql } from './image-job-store.mjs';
import { findDuplicateImageFingerprint, fingerprintArticleImageBytes } from './article-image-policy.mjs';
import { validateImageAttachmentReview } from './editorial-image-policy.mjs';
import { evaluateArticle } from './editorial-quality-lib.mjs';
import { stageReviewedImage } from './stage-reviewed-image.mjs';

const arg = name => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const articleId = arg('article-id');
const sourcePath = arg('file');
const reviewPath = arg('review');
const apply = process.argv.includes('--apply');
if (!articleId || !sourcePath || !reviewPath || !/^[a-z0-9-]+$/.test(articleId)
  || (apply && arg('confirm') !== 'attach-reviewed-image')) {
  console.error('Usage: attach-article-image.mjs --article-id ID --file IMAGE --review REVIEW.json [--apply --confirm attach-reviewed-image]');
  process.exit(1);
}

try {
  const source = await readFile(resolve(sourcePath));
  if (source.length < 1_000 || source.length > 25_000_000) throw new Error('IMAGE_SIZE_INVALID');
  const review = JSON.parse(await readFile(resolve(reviewPath), 'utf8'));
  const sourceSha = createHash('sha256').update(source).digest('hex');
  const plan = validateImageAttachmentReview(review, articleId, sourceSha);
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 768 || metadata.height < 512) throw new Error('IMAGE_DIMENSIONS_TOO_SMALL');
  const normalized = await sharp(source).rotate().resize(1600, 900, { fit: 'cover', position: 'centre' })
    .webp({ quality: 90, effort: 5 }).toBuffer();
  const fingerprint = await fingerprintArticleImageBytes(normalized);
  if (!fingerprint) throw new Error('IMAGE_FINGERPRINT_FAILED');
  const sql = getSql();
  const [current] = await sql`
    SELECT a.status, a.image_url, a.updated_at::text AS article_updated_at,
      r.submission, r.updated_at::text AS review_updated_at
    FROM articles a JOIN editorial_review_jobs r ON r.article_id = a.id WHERE a.id = ${articleId}
  `;
  if (!current || current.status !== 'draft'
    || (current.image_url && !current.image_url.startsWith('/images/heroes/') && !current.image_url.includes('/placeholder-'))) {
    throw new Error('DRAFT_WITH_MISSING_IMAGE_REQUIRED');
  }
  if (review.base_submission_sha256 !== createHash('sha256').update(JSON.stringify(current.submission)).digest('hex')) {
    throw new Error('IMAGE_REVIEW_SUBMISSION_CHANGED');
  }
  const submission = { ...current.submission,
    image_brief: { ...current.submission.image_brief,
      image_policy_version: review.image_brief.image_policy_version,
      source_asset_considered: review.image_brief.source_asset_considered,
      source_asset_note: review.image_brief.source_asset_note,
      source_review: review.image_brief.source_review },
    image_provenance: review.image_provenance, image_alt: review.image_alt,
    image_caption: review.image_provenance.caption, image_visual_review: review.visual_review };
  const machine = evaluateArticle(submission);
  if (!machine.passed) throw new Error('IMAGE_CANDIDATE_GATE_FAILED');
  const existing = await sql`SELECT article_id, sha256, perceptual_hash FROM article_image_fingerprints`;
  if (findDuplicateImageFingerprint(existing, fingerprint, articleId)) throw new Error('IMAGE_DUPLICATE');
  if (!apply) {
    console.log(JSON.stringify({ ok: true, dryRun: true, articleId, acquisition: plan.mode, sourceSha256: sourceSha,
      normalizedSha256: fingerprint.sha256, caption: submission.image_caption }));
    process.exit(0);
  }
  const artifactPath = resolve('var', 'cren-images', articleId, `hero-${fingerprint.sha256.slice(0, 16)}.webp`);
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, normalized);
  const blob = await put(`cren/articles/${articleId}/hero-${fingerprint.sha256.slice(0, 16)}.webp`, normalized, {
    access: 'public', addRandomSuffix: true, allowOverwrite: false, contentType: 'image/webp', cacheControlMaxAge: 31_536_000,
  });
  const response = await fetch(blob.url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('BLOB_VERIFICATION_FAILED');
  const candidate = { ...submission, id: articleId, image_url: blob.url, image_sha256: fingerprint.sha256 };
  const model = plan.mode === 'AI_FALLBACK' ? IMAGE_MODEL : 'verified-source-asset';
  await stageReviewedImage(sql, { articleId, snapshot: current, candidate, fingerprint, model });
  await sql`
    UPDATE newsroom_runs SET image_ready_count = (
      SELECT COUNT(*)::int FROM jsonb_array_elements_text(staged_article_ids) AS staged(article_id)
      JOIN article_image_jobs ON article_image_jobs.article_id = staged.article_id
      WHERE article_image_jobs.status IN ('READY_FOR_REVIEW','PUBLISHED')
    ), updated_at = NOW() WHERE staged_article_ids ? ${articleId}
  `.catch(() => undefined);
  console.log(JSON.stringify({ ok: true, articleId, status: 'READY_FOR_REVIEW', imageUrl: blob.url, artifactPath }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, articleId, error: safeErrorSummary(error) }));
  process.exitCode = 1;
}
