import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { fingerprintArticleImageBytes, hammingDistance, NEAR_DUPLICATE_MAX_DISTANCE } from './article-image-policy.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

/** Visual similarity is a review signal, not proof two photos are identical.
 * Crop probes cover common center/edge crops, not arbitrary transformations.
 */
export async function reuseFingerprint(bytes) {
  const original = await fingerprintArticleImageBytes(bytes);
  if (!original) throw new Error('IMAGE_SIZE_INVALID');
  const { data, info } = await sharp(bytes).rotate().toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const decodedSha256 = sha(Buffer.concat([Buffer.from(`${info.width}:${info.height}:${info.channels}:`), data]));
  const regions = [{ name: 'full', left: 0, top: 0, width: info.width, height: info.height }];
  for (const fraction of [0.8, 0.6]) {
    const width = Math.max(1, Math.floor(info.width * fraction));
    const height = Math.max(1, Math.floor(info.height * fraction));
    const dx = info.width - width; const dy = info.height - height;
    regions.push({ name: `center-${fraction}`, left: Math.floor(dx / 2), top: Math.floor(dy / 2), width, height });
    if (fraction === 0.8) {
      regions.push(...[
        ['left', 0, Math.floor(dy / 2)], ['right', dx, Math.floor(dy / 2)],
        ['top', Math.floor(dx / 2), 0], ['bottom', Math.floor(dx / 2), dy],
      ].map(([name, left, top]) => ({ name: `${name}-${fraction}`, left, top, width, height })));
    }
  }
  const variants = await Promise.all(regions.map(async ({ name, ...region }) => {
    const image = sharp(data, { raw: info }).extract(region);
    const greys = await image.clone().greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
    let hash = 0n;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) hash = (hash << 1n) | BigInt(greys[y * 9 + x] > greys[y * 9 + x + 1]);
    return { name, hash: hash.toString(16).padStart(16, '0'), rgb: await image.resize(32, 32, { fit: 'fill' }).raw().toBuffer() };
  }));
  return { sha256: original.sha256, decodedSha256, variants };
}

function pixelError(a, b) {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let index = 0; index < a.length; index++) sum += (a[index] - b[index]) ** 2;
  return Math.sqrt(sum / a.length);
}

export function compareReuse(left, right) {
  if (left.sha256 === right.sha256) return { kind: 'EXACT_BYTES', distance: 0 };
  if (left.decodedSha256 === right.decodedSha256) return { kind: 'EXACT_PIXELS', distance: 0 };
  const distance = hammingDistance(left.variants[0].hash, right.variants[0].hash);
  if (distance <= NEAR_DUPLICATE_MAX_DISTANCE) return { kind: 'SIMILAR_FULL_FRAME', distance, needsVisualConfirmation: true };
  let best = null;
  for (const a of left.variants) for (const b of right.variants) {
    if (a.name === 'full' && b.name === 'full') continue;
    const candidateDistance = hammingDistance(a.hash, b.hash);
    if (candidateDistance > 6) continue;
    const error = pixelError(a.rgb, b.rgb);
    if (error > 24) continue;
    if (!best || error < best.pixelError) best = { kind: 'POSSIBLE_CROP_REUSE', distance: candidateDistance,
      pixelError: Math.round(error * 100) / 100, leftCrop: a.name, rightCrop: b.name, needsVisualConfirmation: true };
  }
  return best;
}

/** A story's own hero/cards can repeat; reuse between different stories cannot.
 * Generic imagery reused across pages is reported separately. Page counts are
 * not inferred to be distinct editorial owners when no owner metadata exists.
 */
export function classifyImageUsages(record) {
  const articles = [...new Set(record.usages.filter(u => u.kind === 'article').map(u => u.id))];
  const rendered = record.usages.filter(u => u.kind === 'rendered');
  const pages = [...new Set(rendered.map(u => u.path))].sort();
  return { articles, pages, placements: rendered.length,
    crossArticleReuse: articles.length > 1,
    sharedNonArticleAsset: articles.length === 0 && (pages.length > 1 || rendered.length > 1) };
}
