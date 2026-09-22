import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import sharp from 'sharp';
import {
  fingerprintArticleImageBytes, fingerprintArticleImageUrl, hammingDistance, NEAR_DUPLICATE_MAX_DISTANCE,
} from '../lib/article-image-fingerprint-core.ts';

const imageUrl = 'https://fixture.public.blob.vercel-storage.com/hero.png';
async function syntheticImage(descending: boolean, density = 72) {
  const width = 128; const height = 64;
  const data = Buffer.alloc(width * height * 3);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const value = Math.round(column * 255 / (width - 1));
      data.fill(descending ? 255 - value : value, (row * width + column) * 3, (row * width + column) * 3 + 3);
    }
  }
  return sharp(data, { raw: { width, height, channels: 3 } }).withMetadata({ density }).png({ compressionLevel: 0 }).toBuffer();
}

test('Node-compatible core preserves deterministic SHA-256 and 64-bit dHash math', async () => {
  const bytes = await syntheticImage(true);
  assert.ok(bytes.length > 1000);
  const first = await fingerprintArticleImageBytes(bytes);
  assert.deepEqual(await fingerprintArticleImageBytes(bytes), first);
  assert.equal(first.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(first.perceptualHash, 'ffffffffffffffff');
  const ascending = await fingerprintArticleImageBytes(await syntheticImage(false));
  assert.equal(ascending.perceptualHash, '0000000000000000');
  assert.equal(hammingDistance(first.perceptualHash, ascending.perceptualHash), 64);
  assert.equal(NEAR_DUPLICATE_MAX_DISTANCE, 10);
  assert.equal(hammingDistance('0', 'f'), 4);
  assert.equal(hammingDistance('0', 'ff'), Number.POSITIVE_INFINITY);
});

test('encoding metadata changes exact bytes without changing the image perceptual hash', async () => {
  const first = await fingerprintArticleImageBytes(await syntheticImage(true, 72));
  const second = await fingerprintArticleImageBytes(await syntheticImage(true, 144));
  assert.notEqual(first.sha256, second.sha256);
  assert.equal(first.perceptualHash, second.perceptualHash);
});

test('byte fingerprint rejects under/oversized input and invalid image data', async () => {
  await assert.rejects(fingerprintArticleImageBytes(new Uint8Array(999)), /IMAGE_SIZE_INVALID/);
  await assert.rejects(fingerprintArticleImageBytes(new Uint8Array(25_000_001)), /IMAGE_SIZE_INVALID/);
  await assert.rejects(fingerprintArticleImageBytes(new Uint8Array(1000)));
});

test('URL fetch prohibits redirects and hashes a bounded stream without arrayBuffer', async (t) => {
  let timeoutMs: number | undefined;
  const controller = new AbortController();
  t.mock.method(AbortSignal, 'timeout', (milliseconds: number) => { timeoutMs = milliseconds; return controller.signal; });
  const bytes = await syntheticImage(true);
  const result = await fingerprintArticleImageUrl(imageUrl, async (url, init) => {
    assert.equal(url, imageUrl);
    assert.equal(init?.method, 'GET');
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal instanceof AbortSignal);
    const response = new Response(new ReadableStream({ start(controller) {
      controller.enqueue(bytes.subarray(0, 1200));
      controller.enqueue(bytes.subarray(1200));
      controller.close();
    } }), { headers: { 'content-type': 'image/png' } });
    response.arrayBuffer = async () => { throw new Error('UNBOUNDED_ARRAY_BUFFER_FORBIDDEN'); };
    return response;
  });
  assert.equal(timeoutMs, 15_000);
  assert.deepEqual(result, await fingerprintArticleImageBytes(bytes));
});

test('unknown-length oversized response is canceled after crossing the 25 MB limit', async () => {
  let canceled = false; let pulls = 0;
  const result = await fingerprintArticleImageUrl(imageUrl, async () => new Response(new ReadableStream({
    pull(controller) { pulls++; controller.enqueue(new Uint8Array(13_000_000)); },
    cancel() { canceled = true; },
  }, { highWaterMark: 0 }), { headers: { 'content-type': 'image/png' } }));
  assert.equal(result, null);
  assert.equal(pulls, 2);
  assert.equal(canceled, true);
});

test('oversized declared response is canceled before any body read', async () => {
  let canceled = false; let pulls = 0;
  const result = await fingerprintArticleImageUrl(imageUrl, async () => new Response(new ReadableStream({
    pull(controller) { pulls++; controller.enqueue(new Uint8Array(1000)); },
    cancel() { canceled = true; },
  }, { highWaterMark: 0 }), { headers: { 'content-type': 'image/png', 'content-length': '25000001' } }));
  assert.equal(result, null); assert.equal(pulls, 0); assert.equal(canceled, true);
});

test('untrusted URL, redirect rejection, bad HTTP response and decode errors fail closed', async () => {
  let calls = 0;
  assert.equal(await fingerprintArticleImageUrl('http://localhost/image', async () => { calls++; throw new Error('MUST_NOT_FETCH'); }), null);
  assert.equal(calls, 0);
  assert.equal(await fingerprintArticleImageUrl(imageUrl, async () => { throw new TypeError('Redirect prohibited'); }), null);
  assert.equal(await fingerprintArticleImageUrl(imageUrl, async () => new Response(null, { status: 404 })), null);
  assert.equal(await fingerprintArticleImageUrl(imageUrl, async () => new Response('not an image', { headers: { 'content-type': 'text/html' } })), null);
  assert.equal(await fingerprintArticleImageUrl(imageUrl, async () => new Response(new Uint8Array(1000), { headers: { 'content-type': 'image/png' } })), null);
});
