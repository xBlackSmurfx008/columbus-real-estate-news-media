import { createHash } from 'node:crypto';
import { validateImageAttachmentReview } from '../scripts/editorial-image-policy.mjs';

export const CLOUD_IMAGE_REPOSITORY = 'xBlackSmurfx008/columbus-real-estate-news-media';
export const CLOUD_SOURCE_IMAGE_MAX_BYTES = 25_000_000;
export const CLOUD_SOURCE_IMAGE_TIMEOUT_MS = 15_000;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function validatedAssetPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 240
    || !/^frontend\/content\/images\/\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp)$/.test(value)) {
    throw new Error('CLOUD_IMAGE_PATH_INVALID');
  }
  const date = value.slice('frontend/content/images/'.length, 'frontend/content/images/'.length + 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('CLOUD_IMAGE_PATH_INVALID');
  }
  return value;
}

/** Read-only server helper: the caller supplies the immutable commit from its authenticated
 * import receipt, NEVER from article JSON. No arbitrary URL/repository/branch is accepted.
 * A review is recorded evidence, not automatic proof of authenticity or permission. The
 * attachment worker must still decode/crop, fingerprint, deduplicate and atomically stage.
 */
export async function prepareCloudSourceImage(input: {
  articleId: string;
  submission: unknown;
  importCommitSha: string;
}, dependencies: { fetch?: typeof fetch } = {}) {
  if (!/^[a-z0-9][a-z0-9-]{0,239}$/.test(input.articleId)) throw new Error('CLOUD_IMAGE_ARTICLE_ID_INVALID');
  if (!/^[a-f0-9]{40}$/.test(input.importCommitSha)) throw new Error('CLOUD_IMAGE_COMMIT_INVALID');
  const submission = record(input.submission);
  const asset = record(submission.cloud_image_asset);
  const path = validatedAssetPath(asset.path);
  if (typeof asset.git_blob_sha !== 'string' || !/^[a-f0-9]{40}$/.test(asset.git_blob_sha)) {
    throw new Error('CLOUD_IMAGE_GIT_BLOB_SHA_INVALID');
  }
  if (typeof asset.source_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(asset.source_sha256)) {
    throw new Error('CLOUD_IMAGE_SOURCE_SHA_INVALID');
  }
  // Snapshot all caller-owned data before the asynchronous fetch; never spread an untrusted
  // nested review over the canonical article provenance or server-selected article identity.
  const review = structuredClone({
    article_id: input.articleId,
    source_sha256: asset.source_sha256,
    image_alt: submission.image_alt,
    image_caption: submission.image_caption,
    image_brief: submission.image_brief,
    image_provenance: submission.image_provenance,
    visual_review: asset.visual_review,
  });
  const plan = validateImageAttachmentReview(review, input.articleId, asset.source_sha256);
  if (plan.mode !== 'SOURCE_ASSET') throw new Error('CLOUD_IMAGE_SOURCE_ASSET_REQUIRED');
  const sourceSha256 = asset.source_sha256;
  const gitBlobSha = asset.git_blob_sha;
  const commitSha = input.importCommitSha;
  const url = `https://raw.githubusercontent.com/${CLOUD_IMAGE_REPOSITORY}/${commitSha}/${path}`;
  const response = await (dependencies.fetch ?? fetch)(url, {
    method: 'GET', redirect: 'error', cache: 'no-store',
    signal: AbortSignal.timeout(CLOUD_SOURCE_IMAGE_TIMEOUT_MS),
  });
  if (!response.ok || response.redirected || (response.url && response.url !== url)) {
    await response.body?.cancel();
    throw new Error('CLOUD_IMAGE_FETCH_FAILED');
  }
  const advertisedLength = response.headers.get('content-length');
  if (advertisedLength !== null && (!/^\d+$/.test(advertisedLength)
    || Number(advertisedLength) > CLOUD_SOURCE_IMAGE_MAX_BYTES)) {
    await response.body?.cancel();
    throw new Error('CLOUD_IMAGE_SIZE_INVALID');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('CLOUD_IMAGE_BODY_MISSING');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > CLOUD_SOURCE_IMAGE_MAX_BYTES) throw new Error('CLOUD_IMAGE_SIZE_INVALID');
      chunks.push(part.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (length < 1_000) throw new Error('CLOUD_IMAGE_SIZE_INVALID');
  const sourceBytes = Buffer.concat(chunks, length);
  if (createHash('sha256').update(sourceBytes).digest('hex') !== sourceSha256) {
    throw new Error('CLOUD_IMAGE_SOURCE_SHA_MISMATCH');
  }
  const actualGitBlobSha = createHash('sha1').update(`blob ${length}\0`).update(sourceBytes).digest('hex');
  if (actualGitBlobSha !== gitBlobSha) throw new Error('CLOUD_IMAGE_GIT_BLOB_SHA_MISMATCH');
  return { sourceBytes, sourceSha256, gitBlobSha, commitSha, path, plan, review };
}
