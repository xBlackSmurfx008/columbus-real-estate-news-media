#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { del, put } from "@vercel/blob";
import sharp from "sharp";
import { IMAGE_MODEL, safeErrorSummary } from "./image-pipeline-lib.mjs";
import { ensureImageJobTable, getSql, withRetry } from "./image-job-store.mjs";
import {
  ensureArticleImageFingerprintTable,
  findDuplicateImageFingerprint,
  fingerprintArticleImageBytes,
} from './article-image-policy.mjs';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const articleId = arg("article-id");
const sourcePath = arg("file");
if (!articleId || !sourcePath || !/^[a-z0-9-]+$/.test(articleId)) {
  console.error("Usage: node scripts/attach-article-image.mjs --article-id <id> --file <image>");
  process.exit(1);
}

const sql = getSql();
await withRetry(() => ensureImageJobTable(sql));
await withRetry(() => ensureArticleImageFingerprintTable(sql));
await withRetry(() => sql`
  INSERT INTO article_image_jobs (article_id, status, model, attempts, started_at, updated_at)
  VALUES (${articleId}, 'GENERATING', ${IMAGE_MODEL}, 1, NOW(), NOW())
  ON CONFLICT (article_id) DO UPDATE SET
    status = 'GENERATING',
    model = EXCLUDED.model,
    updated_at = NOW()
`);

let blobUrl;
let articleAttached = false;
try {
  const source = await readFile(resolve(sourcePath));
  if (source.length < 1_000 || source.length > 25_000_000) throw new Error("IMAGE_SIZE_INVALID");
  const sourceMetadata = await sharp(source).metadata();
  if (!sourceMetadata.width || !sourceMetadata.height || sourceMetadata.width < 768 || sourceMetadata.height < 512) {
    throw new Error("IMAGE_DIMENSIONS_TOO_SMALL");
  }

  const normalized = await sharp(source)
    .rotate()
    .resize(1600, 900, { fit: "cover", position: "attention" })
    .webp({ quality: 86, effort: 5 })
    .toBuffer();
  const fingerprint = await fingerprintArticleImageBytes(normalized);
  if (!fingerprint) throw new Error('IMAGE_FINGERPRINT_FAILED');
  const sha256 = fingerprint.sha256;
  const existingFingerprints = await withRetry(() => sql`
    SELECT article_id, sha256, perceptual_hash FROM article_image_fingerprints
  `);
  const duplicate = findDuplicateImageFingerprint(existingFingerprints, fingerprint, articleId);
  if (duplicate) {
    throw new Error(`IMAGE_DUPLICATE_${duplicate.kind}_${duplicate.articleId}_${duplicate.distance}`);
  }
  const artifactPath = resolve("var", "cren-images", articleId, `hero-${sha256.slice(0, 16)}.webp`);
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, normalized);

  const blob = await put(`cren/articles/${articleId}/hero-${sha256.slice(0, 16)}.webp`, normalized, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "image/webp",
    cacheControlMaxAge: 31_536_000,
  });
  blobUrl = blob.url;
  const check = await fetch(blob.url, { method: "HEAD", signal: AbortSignal.timeout(10_000) });
  if (!check.ok || !check.headers.get("content-type")?.startsWith("image/")) {
    throw new Error("BLOB_VERIFICATION_FAILED");
  }

  await withRetry(() => sql`
    INSERT INTO article_image_fingerprints (article_id, image_url, sha256, perceptual_hash, verified_at)
    VALUES (${articleId}, ${blob.url}, ${fingerprint.sha256}, ${fingerprint.perceptualHash}, NOW())
    ON CONFLICT (article_id) DO UPDATE SET
      image_url = EXCLUDED.image_url,
      sha256 = EXCLUDED.sha256,
      perceptual_hash = EXCLUDED.perceptual_hash,
      verified_at = NOW()
  `);

  const [updated] = await withRetry(() => sql`
    UPDATE articles
    SET image_url = ${blob.url}, updated_at = NOW()
    WHERE id = ${articleId} AND status IN ('draft', 'live')
      AND (image_url IS NULL OR image_url LIKE '/images/heroes/%')
    RETURNING id, title
  `);
  if (!updated) {
    await sql`DELETE FROM article_image_fingerprints WHERE article_id = ${articleId} AND image_url = ${blob.url}`;
    await del(blob.url).catch(() => undefined);
    process.stdout.write(`${JSON.stringify({ ok: true, noOp: true, articleId })}\n`);
    process.exit(0);
  }
  articleAttached = true;

  await withRetry(() => sql`
    UPDATE article_image_jobs SET
      status = 'READY_FOR_REVIEW',
      source_sha256 = ${sha256},
      image_url = ${blob.url},
      last_error_code = NULL,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE article_id = ${articleId}
  `).catch(() => undefined);
  process.stdout.write(`${JSON.stringify({ ok: true, articleId, status: 'READY_FOR_REVIEW', title: updated.title, imageUrl: blob.url, artifactPath })}\n`);
} catch (error) {
  if (blobUrl && !articleAttached) {
    await sql`DELETE FROM article_image_fingerprints WHERE article_id = ${articleId} AND image_url = ${blobUrl}`
      .catch(() => undefined);
    await del(blobUrl).catch(() => undefined);
  }
  const errorCode = safeErrorSummary(error).replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 100) || "IMAGE_ATTACH_FAILED";
  await withRetry(() => sql`
    UPDATE article_image_jobs SET
      status = 'FAILED',
      last_error_code = ${errorCode},
      updated_at = NOW()
    WHERE article_id = ${articleId}
  `).catch(() => undefined);
  process.stderr.write(`${JSON.stringify({ ok: false, articleId, error: errorCode })}\n`);
  process.exit(1);
}
