#!/usr/bin/env node

import { ensureImageJobTable, getSql, withRetry } from './image-job-store.mjs';
import {
  ensureArticleImageFingerprintTable,
  findDuplicateImageFingerprint,
  fingerprintArticleImageUrl,
} from './article-image-policy.mjs';

const write = process.argv.includes('--write');
const sql = getSql();

await withRetry(() => ensureImageJobTable(sql));
await withRetry(() => ensureArticleImageFingerprintTable(sql));

const articles = await withRetry(() => sql`
  SELECT a.id, a.title, a.image_url, f.article_id AS fingerprint_article_id,
         f.sha256, f.perceptual_hash
  FROM articles a
  LEFT JOIN article_image_fingerprints f ON f.article_id = a.id
  LEFT JOIN article_image_jobs j ON j.article_id = a.id
  WHERE a.status = 'live'
    AND a.image_url IS NOT NULL
    AND a.image_url <> ''
    AND j.article_id IS NULL
  ORDER BY a.created_at ASC, a.id ASC
`);

const existingFingerprints = await withRetry(() => sql`
  SELECT article_id, sha256, perceptual_hash
  FROM article_image_fingerprints
`);
const reconciled = [];

for (const article of articles) {
  let fingerprint = article.fingerprint_article_id
    ? { sha256: article.sha256, perceptualHash: article.perceptual_hash }
    : await fingerprintArticleImageUrl(article.image_url);
  const duplicate = fingerprint
    ? findDuplicateImageFingerprint(existingFingerprints, fingerprint, article.id)
    : null;
  const status = fingerprint && !duplicate ? 'PUBLISHED' : 'FAILED';
  const lastErrorCode = duplicate
    ? `IMAGE_DUPLICATE_${duplicate.kind}_${duplicate.articleId}`
    : fingerprint
      ? null
      : 'IMAGE_FINGERPRINT_FAILED';
  const result = {
    articleId: article.id,
    title: article.title,
    status,
    lastErrorCode,
    duplicateOf: duplicate?.articleId ?? null,
  };
  reconciled.push(result);

  if (write) {
    if (fingerprint && !duplicate && !article.fingerprint_article_id) {
      await sql`
        INSERT INTO article_image_fingerprints (article_id, image_url, sha256, perceptual_hash, verified_at)
        VALUES (${article.id}, ${article.image_url}, ${fingerprint.sha256}, ${fingerprint.perceptualHash}, NOW())
        ON CONFLICT (article_id) DO NOTHING
      `;
    }
    await sql`
      INSERT INTO article_image_jobs (
        article_id, status, model, attempts, last_error_code,
        source_sha256, image_url, completed_at, updated_at
      ) VALUES (
        ${article.id}, ${status}, 'legacy-reconciliation', 0, ${lastErrorCode},
        ${status === 'PUBLISHED' ? fingerprint.sha256 : null}, ${article.image_url},
        NOW(), NOW()
      )
      ON CONFLICT (article_id) DO NOTHING
    `;
  }
  if (fingerprint && !duplicate) {
    existingFingerprints.push({
      article_id: article.id,
      sha256: fingerprint.sha256,
      perceptual_hash: fingerprint.perceptualHash,
    });
  }
}

console.log(JSON.stringify({ write, scanned: articles.length, reconciled }, null, 2));
