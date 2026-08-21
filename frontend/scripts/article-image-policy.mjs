import { createHash } from 'node:crypto';
import sharp from 'sharp';

export const NEAR_DUPLICATE_MAX_DISTANCE = 10;

export function isDurableArticleImageUrl(value) {
  if (typeof value !== 'string' || value.length === 0) return false;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;

    return url.hostname === 'images.unsplash.com'
      || url.hostname.endsWith('.cloudfront.net')
      || url.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

export async function fingerprintArticleImageBytes(bytes) {
  if (bytes.length < 1_000 || bytes.length > 25_000_000) return null;
  const width = 9;
  const height = 8;
  const raw = await sharp(bytes).greyscale().resize(width, height, { fit: 'fill' }).raw().toBuffer();
  const bits = [];
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width - 1; column += 1) {
      bits.push(raw[row * width + column] > raw[row * width + column + 1] ? 1 : 0);
    }
  }
  let perceptualHash = '';
  for (let index = 0; index < bits.length; index += 4) {
    const nibble = (bits[index] << 3) | (bits[index + 1] << 2) | (bits[index + 2] << 1) | bits[index + 3];
    perceptualHash += nibble.toString(16);
  }
  return {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    perceptualHash,
  };
}

export function hammingDistance(left, right) {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const difference = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    distance += ((difference >> 3) & 1) + ((difference >> 2) & 1) + ((difference >> 1) & 1) + (difference & 1);
  }
  return distance;
}

export async function fingerprintArticleImageUrl(value, fetchImpl = fetch) {
  if (!isDurableArticleImageUrl(value)) return null;

  try {
    const response = await fetchImpl(value, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok || response.headers.get('content-type')?.startsWith('image/') !== true) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    return fingerprintArticleImageBytes(bytes);
  } catch {
    return null;
  }
}

export function findDuplicateImageGroups(articles) {
  const byFingerprint = new Map();
  for (const article of articles) {
    if (!article?.image_sha256) continue;
    const group = byFingerprint.get(article.image_sha256) ?? [];
    group.push({ id: article.id, title: article.title, image_url: article.image_url });
    byFingerprint.set(article.image_sha256, group);
  }

  return [...byFingerprint.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([image_sha256, group]) => ({ image_sha256, count: group.length, articles: group }))
    .sort((left, right) => right.count - left.count);
}

export function findDuplicateImageFingerprint(rows, candidate, excludeArticleId) {
  let closest = null;
  for (const row of rows) {
    if (row.article_id === excludeArticleId) continue;
    if (row.sha256 === candidate.sha256) {
      return { kind: 'EXACT', articleId: row.article_id, distance: 0 };
    }
    const distance = hammingDistance(row.perceptual_hash, candidate.perceptualHash);
    if (distance <= NEAR_DUPLICATE_MAX_DISTANCE && (!closest || distance < closest.distance)) {
      closest = { kind: 'NEAR', articleId: row.article_id, distance };
    }
  }
  return closest;
}

export async function ensureArticleImageFingerprintTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS article_image_fingerprints (
      article_id TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      sha256 TEXT NOT NULL UNIQUE,
      perceptual_hash TEXT NOT NULL,
      verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function verifyArticleImageUrl(value, fetchImpl = fetch) {
  if (!isDurableArticleImageUrl(value)) return false;

  try {
    const response = await fetchImpl(value, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok && response.headers.get('content-type')?.startsWith('image/') === true;
  } catch {
    return false;
  }
}
