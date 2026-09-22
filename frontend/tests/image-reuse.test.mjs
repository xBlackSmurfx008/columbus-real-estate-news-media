import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { reuseFingerprint, compareReuse, classifyImageUsages } from '../scripts/image-reuse-lib.mjs';

async function fixture() {
  const width = 160; const height = 120;
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 3;
    data[i] = (Math.sin(x / 9) * 80 + y * 1.1 + 90) % 256;
    data[i + 1] = (Math.cos(y / 7) * 80 + x + 100) % 256;
    data[i + 2] = (x * 2 + y * 3) % 256;
  }
  return sharp(data, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

test('exact bytes and lossless re-encoding are caught independently', async () => {
  const bytes = await fixture();
  const first = await reuseFingerprint(bytes);
  assert.equal(compareReuse(first, first).kind, 'EXACT_BYTES');
  const encoded = await sharp(bytes).png({ compressionLevel: 0 }).toBuffer();
  const second = await reuseFingerprint(encoded);
  assert.notEqual(first.sha256, second.sha256);
  assert.equal(compareReuse(first, second).kind, 'EXACT_PIXELS');
});

test('resized and recompressed images are flagged for inspection', async () => {
  const bytes = await fixture();
  const variant = await sharp(bytes).resize(320, 240).jpeg({ quality: 85 }).toBuffer();
  const result = compareReuse(await reuseFingerprint(bytes), await reuseFingerprint(variant));
  assert.ok(result);
  assert.equal(result.needsVisualConfirmation, true);
});

test('center crop is flagged without claiming exhaustive crop matching', async () => {
  const bytes = await fixture();
  const crop = await sharp(bytes).extract({ left: 16, top: 12, width: 128, height: 96 }).jpeg({ quality: 90 }).toBuffer();
  const result = compareReuse(await reuseFingerprint(bytes), await reuseFingerprint(crop));
  assert.ok(result);
  assert.equal(result.needsVisualConfirmation, true);
});

test('clearly different fingerprints are not declared duplicates', () => {
  const base = { sha256: 'a', decodedSha256: 'a', variants: [{ name: 'full', hash: '0'.repeat(16), rgb: Buffer.alloc(3) }] };
  const other = { sha256: 'b', decodedSha256: 'b', variants: [{ name: 'full', hash: 'f'.repeat(16), rgb: Buffer.alloc(3, 255) }] };
  assert.equal(compareReuse(base, other), null);
});

test('one story shown on several pages is not cross-story reuse', () => {
  const result = classifyImageUsages({ usages: [
    { kind: 'article', id: 'a' }, { kind: 'article', id: 'a' },
    { kind: 'rendered', path: '/' }, { kind: 'rendered', path: '/blog/a' },
  ] });
  assert.equal(result.crossArticleReuse, false);
  assert.equal(result.sharedNonArticleAsset, false);
});

test('different articles sharing an image and repeated generic guide assets are reported', () => {
  assert.equal(classifyImageUsages({ usages: [{ kind: 'article', id: 'a' }, { kind: 'article', id: 'b' }] }).crossArticleReuse, true);
  const guide = classifyImageUsages({ usages: [{ kind: 'rendered', path: '/areas/a' }, { kind: 'rendered', path: '/areas/a' }, { kind: 'rendered', path: '/areas/b' }] });
  assert.equal(guide.sharedNonArticleAsset, true);
  assert.equal(guide.placements, 3);
  assert.equal(guide.pages.length, 2);
});
