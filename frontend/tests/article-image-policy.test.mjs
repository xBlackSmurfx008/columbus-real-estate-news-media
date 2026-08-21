import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findDuplicateImageFingerprint,
  hammingDistance,
  isDurableArticleImageUrl,
} from '../scripts/article-image-policy.mjs';

test('article images must use an approved durable HTTPS host', () => {
  assert.equal(isDurableArticleImageUrl('/images/heroes/fallback.webp'), false);
  assert.equal(isDurableArticleImageUrl('http://example.com/hero.webp'), false);
  assert.equal(isDurableArticleImageUrl('https://store.public.blob.vercel-storage.com/hero.webp'), true);
});

test('exact image fingerprints are rejected across articles', () => {
  const duplicate = findDuplicateImageFingerprint([
    { article_id: 'existing', sha256: 'a'.repeat(64), perceptual_hash: '0'.repeat(16) },
  ], { sha256: 'a'.repeat(64), perceptualHash: 'f'.repeat(16) });
  assert.deepEqual(duplicate, { kind: 'EXACT', articleId: 'existing', distance: 0 });
});

test('near-duplicate perceptual fingerprints are rejected', () => {
  assert.equal(hammingDistance('0000000000000000', '000000000000000f'), 4);
  const duplicate = findDuplicateImageFingerprint([
    { article_id: 'existing', sha256: 'a'.repeat(64), perceptual_hash: '0'.repeat(16) },
  ], { sha256: 'b'.repeat(64), perceptualHash: '000000000000000f' });
  assert.deepEqual(duplicate, { kind: 'NEAR', articleId: 'existing', distance: 4 });
});

test('visually distinct fingerprints are accepted', () => {
  const duplicate = findDuplicateImageFingerprint([
    { article_id: 'existing', sha256: 'a'.repeat(64), perceptual_hash: '0'.repeat(16) },
  ], { sha256: 'b'.repeat(64), perceptualHash: 'f'.repeat(16) });
  assert.equal(duplicate, null);
});
