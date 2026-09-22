#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { neon } from '@neondatabase/serverless';
import {
  findDuplicateImageFingerprint,
  fingerprintArticleImageUrl,
  isDurableArticleImageUrl,
} from './article-image-policy.mjs';

export function fingerprintSyncOptions(args) {
  if (args.some(arg => !['--apply', '--dry-run'].includes(arg))) throw new Error('UNKNOWN_FINGERPRINT_SYNC_ARGUMENT');
  if (args.includes('--apply') && args.includes('--dry-run')) throw new Error('CONFLICTING_FINGERPRINT_SYNC_ARGUMENTS');
  return { apply: args.includes('--apply') };
}

const validHash = row => /^[a-f0-9]{64}$/.test(row?.sha256 ?? '')
  && /^[a-f0-9]{16}$/.test(row?.perceptualHash ?? '');

/** Read-only by default. Refresh the complete checked corpus in one guarded commit. */
export async function syncImageFingerprints(sql, { apply = false, fingerprint = fingerprintArticleImageUrl } = {}) {
  // One read snapshot, before network work; text timestamps retain microseconds.
  // Missing schema is an explicit error, never an implicit production migration.
  const [snapshot] = await sql`
    SELECT generation::text AS generation,
      (SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.id), '[]'::jsonb) FROM (
        SELECT id, status, image_url, updated_at::text AS updated_at FROM articles
        WHERE status IN ('draft', 'live') AND image_url IS NOT NULL
      ) a) AS articles,
      (SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.article_id), '[]'::jsonb) FROM (
        SELECT article_id, image_url, sha256, perceptual_hash FROM article_image_fingerprints
      ) f) AS fingerprints
    FROM editorial_publication_fence WHERE id = 1
  `;
  if (!snapshot) throw new Error('IMAGE_FINGERPRINT_MIGRATION_REQUIRED');
  const { articles, fingerprints: cached } = snapshot;
  const fresh = [], duplicates = [], invalid = [], cacheIssues = [];
  const scope = new Map(articles.map(article => [article.id, article]));
  for (const row of cached) {
    const article = scope.get(row.article_id);
    const malformed = !validHash({ sha256: row.sha256, perceptualHash: row.perceptual_hash });
    if (!article) {
      // Do not silently discard orphaned/out-of-scope or malformed historical rows.
      invalid.push({ articleId: row.article_id, reason: 'FINGERPRINT_OUTSIDE_CHECKED_CORPUS' });
    }
    if (malformed) cacheIssues.push({ articleId: row.article_id, reason: 'MALFORMED_CACHED_FINGERPRINT' });
    if (article && row.image_url !== article.image_url) cacheIssues.push({ articleId: row.article_id, reason: 'STALE_CACHED_IMAGE_URL' });
  }
  for (const article of articles) {
    if (!isDurableArticleImageUrl(article.image_url)) {
      invalid.push({ articleId: article.id, reason: 'NON_DURABLE_URL' });
      continue;
    }
    let result;
    try { result = await fingerprint(article.image_url); } catch { /* a failed refresh blocks every write */ }
    if (!validHash(result)) {
      invalid.push({ articleId: article.id, reason: 'UNREACHABLE_OR_INVALID_FINGERPRINT' });
      continue;
    }
    const duplicateUrl = fresh.find(row => row.image_url === article.image_url);
    const duplicate = duplicateUrl
      ? { kind: 'URL', articleId: duplicateUrl.article_id, distance: 0 }
      : findDuplicateImageFingerprint(fresh, result, article.id);
    if (duplicate) duplicates.push({ ...duplicate, articleId: article.id, duplicateOf: duplicate.articleId });
    const prior = cached.find(row => row.article_id === article.id);
    if (!prior) cacheIssues.push({ articleId: article.id, reason: 'MISSING_CACHED_FINGERPRINT' });
    else if (prior.sha256 !== result.sha256 || prior.perceptual_hash !== result.perceptualHash) {
      cacheIssues.push({ articleId: article.id, reason: 'STALE_CACHED_IMAGE_HASH' });
    }
    // Keep even duplicate rows in the comparison set, so subsequent collisions stay visible.
    fresh.push({ article_id: article.id, image_url: article.image_url,
      sha256: result.sha256, perceptual_hash: result.perceptualHash });
  }
  const report = { ok: invalid.length === 0 && duplicates.length === 0,
    mode: apply ? 'write' : 'dry-run', scanned: articles.length,
    [apply ? 'synced' : 'wouldSync']: 0, duplicates, invalid, cacheIssues };
  if (!report.ok || !fresh.length) return report;
  if (!apply) return { ...report, wouldSync: fresh.length };

  const [committed] = await sql`
    WITH image_lock AS MATERIALIZED (
      SELECT generation FROM editorial_publication_fence WHERE id = 1 FOR UPDATE
    ), locked_articles AS MATERIALIZED (
      SELECT a.id, a.status, a.image_url, a.updated_at::text AS updated_at FROM articles a, image_lock
      WHERE a.status IN ('draft', 'live') AND a.image_url IS NOT NULL ORDER BY a.id FOR UPDATE OF a
    ), locked_fingerprints AS MATERIALIZED (
      SELECT f.article_id, f.image_url, f.sha256, f.perceptual_hash FROM article_image_fingerprints f, image_lock
      ORDER BY f.article_id FOR UPDATE OF f
    ), eligible AS MATERIALIZED (
      SELECT 1 FROM image_lock WHERE generation = ${snapshot.generation}::bigint
        AND (SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.id), '[]'::jsonb) FROM locked_articles a)
          = ${JSON.stringify(articles)}::jsonb
        AND (SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.article_id), '[]'::jsonb) FROM locked_fingerprints f)
          = ${JSON.stringify(cached)}::jsonb
    ), fingerprinted AS (
      INSERT INTO article_image_fingerprints(article_id, image_url, sha256, perceptual_hash, verified_at)
      SELECT f.article_id, f.image_url, f.sha256, f.perceptual_hash, NOW()
      FROM jsonb_to_recordset(${JSON.stringify(fresh)}::jsonb)
        AS f(article_id text, image_url text, sha256 text, perceptual_hash text)
      WHERE EXISTS (SELECT 1 FROM eligible)
      ON CONFLICT(article_id) DO UPDATE SET image_url = EXCLUDED.image_url, sha256 = EXCLUDED.sha256,
        perceptual_hash = EXCLUDED.perceptual_hash, verified_at = NOW() RETURNING article_id
    ), fenced AS (
      UPDATE editorial_publication_fence SET generation = generation + 1
      WHERE id = 1 AND EXISTS (SELECT 1 FROM fingerprinted)
    ) SELECT COUNT(*)::int AS count FROM fingerprinted
  `;
  if (Number(committed?.count) !== fresh.length) {
    return { ...report, ok: false, invalid: [{ reason: 'FINGERPRINT_SYNC_CHANGED_STATE_RETRY' }] };
  }
  return { ...report, synced: fresh.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = fingerprintSyncOptions(process.argv.slice(2));
    try { process.loadEnvFile?.('.env.local'); } catch { /* environment may already be loaded */ }
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL environment variable is not set');
    const report = await syncImageFingerprints(neon(process.env.DATABASE_URL), options);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    // Do not expose connection strings, remote URLs, or query parameters on errors.
    console.error(error instanceof Error && /^[A-Z_]+$/.test(error.message)
      ? error.message : 'FINGERPRINT_SYNC_FAILED_CHECK_SCHEMA_AND_RETRY');
    process.exitCode = 1;
  }
}
