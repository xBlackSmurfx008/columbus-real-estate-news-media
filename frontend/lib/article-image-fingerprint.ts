import 'server-only';

import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { isDurableArticleImageUrl } from '@/lib/article-image';

export const NEAR_DUPLICATE_MAX_DISTANCE = 10;

export type ArticleImageFingerprint = {
  sha256: string;
  perceptualHash: string;
};

export function hammingDistance(left: string, right: string): number {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const difference = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    distance += ((difference >> 3) & 1) + ((difference >> 2) & 1) + ((difference >> 1) & 1) + (difference & 1);
  }
  return distance;
}

export async function fingerprintArticleImageBytes(bytes: Uint8Array): Promise<ArticleImageFingerprint> {
  if (bytes.byteLength < 1_000 || bytes.byteLength > 25_000_000) throw new Error('IMAGE_SIZE_INVALID');
  const width = 9;
  const height = 8;
  const raw = await sharp(Buffer.from(bytes))
    .greyscale()
    .resize(width, height, { fit: 'fill' })
    .raw()
    .toBuffer();

  const bits: number[] = [];
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
    sha256: createHash('sha256').update(Buffer.from(bytes)).digest('hex'),
    perceptualHash,
  };
}

export async function fingerprintArticleImageUrl(
  value: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<ArticleImageFingerprint | null> {
  if (!isDurableArticleImageUrl(value)) return null;
  try {
    const response = await fetchImpl(value, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok || response.headers.get('content-type')?.startsWith('image/') !== true) return null;
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > 25_000_000) return null;
    return fingerprintArticleImageBytes(new Uint8Array(await response.arrayBuffer()));
  } catch {
    return null;
  }
}
