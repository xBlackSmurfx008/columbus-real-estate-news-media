#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import {
  ensureArticleImageFingerprintTable,
  findDuplicateImageFingerprint,
  fingerprintArticleImageUrl,
  isDurableArticleImageUrl,
} from './article-image-policy.mjs';

try { process.loadEnvFile?.('.env.local'); } catch { /* environment may already be loaded */ }

const dryRun = process.argv.includes('--dry-run');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
if (!dryRun) {
  await ensureArticleImageFingerprintTable(sql);
}
const articles = await sql`
  SELECT id, title, status, image_url
  FROM articles
  WHERE status IN ('draft', 'live') AND image_url IS NOT NULL
  ORDER BY created_at ASC
`;

const known = [];
const synced = [];
const duplicates = [];
const invalid = [];

for (const article of articles) {
  if (!isDurableArticleImageUrl(article.image_url)) {
    invalid.push({ articleId: article.id, reason: 'NON_DURABLE_URL' });
    continue;
  }
  const fingerprint = await fingerprintArticleImageUrl(article.image_url);
  if (!fingerprint) {
    invalid.push({ articleId: article.id, reason: 'UNREACHABLE_OR_UNDECODABLE' });
    continue;
  }
  const duplicate = findDuplicateImageFingerprint(known, fingerprint, article.id);
  if (duplicate) {
    duplicates.push({ ...duplicate, articleId: article.id, duplicateOf: duplicate.articleId });
    continue;
  }

  if (!dryRun) {
    await sql`
      INSERT INTO article_image_fingerprints (article_id, image_url, sha256, perceptual_hash, verified_at)
      VALUES (${article.id}, ${article.image_url}, ${fingerprint.sha256}, ${fingerprint.perceptualHash}, NOW())
      ON CONFLICT (article_id) DO UPDATE SET
        image_url = EXCLUDED.image_url,
        sha256 = EXCLUDED.sha256,
        perceptual_hash = EXCLUDED.perceptual_hash,
        verified_at = NOW()
    `;
  }
  known.push({
    article_id: article.id,
    sha256: fingerprint.sha256,
    perceptual_hash: fingerprint.perceptualHash,
  });
  synced.push(article.id);
}

process.stdout.write(`${JSON.stringify({
  ok: duplicates.length === 0 && invalid.length === 0,
  mode: dryRun ? 'dry-run' : 'write',
  scanned: articles.length,
  [dryRun ? 'wouldSync' : 'synced']: synced.length,
  duplicates,
  invalid,
}, null, 2)}\n`);
if (duplicates.length > 0 || invalid.length > 0) process.exitCode = 1;
