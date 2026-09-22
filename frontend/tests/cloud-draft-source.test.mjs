import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { easternDate, readCloudDrafts } from '../scripts/cloud-draft-source.mjs';

const now = new Date('2026-09-22T12:00:00Z');
const commit = 'a'.repeat(40);
const api = 'https://api.github.com/repos/xBlackSmurfx008/columbus-real-estate-news-media';
const prefix = 'frontend/content/articles/';
const article = { title: 'A draft only', image_url: null };
function artifact(name = '2026-09-22-a-draft.json', value = article) {
  const bytes = Buffer.from(JSON.stringify(value));
  const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  return { entry: { name, path: `${prefix}${name}`, type: 'file', size: bytes.length, sha },
    blob: { sha, size: bytes.length, encoding: 'base64', content: bytes.toString('base64') }, bytes };
}
function fixture(items = [artifact()], mutate = () => {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    let body;
    if (url === `${api}/git/ref/heads/main`) body = { ref: 'refs/heads/main', object: { type: 'commit', sha: commit } };
    else if (url === `${api}/contents/frontend/content/articles?ref=${commit}`) body = items.map(item => item.entry);
    else if (url.startsWith(`${api}/git/blobs/`)) body = items.find(item => url.endsWith(item.entry.sha))?.blob;
    else throw new Error('Unexpected host or request');
    body = structuredClone(body);
    const response = mutate(body, calls.length, url);
    return response ?? Response.json(body);
  };
  return { calls, fetcher };
}

test('Eastern calendar day handles UTC rollover and DST', () => {
  assert.equal(easternDate(new Date('2026-09-23T02:00:00Z')), '2026-09-22');
  assert.equal(easternDate(new Date('2026-01-23T04:59:00Z')), '2026-01-22');
  assert.throws(() => easternDate(new Date('invalid')), /CLOUD_DRAFT_INVALID_DATE/);
});

test('reads immutable commit and verified blob with no credentials and ignores stale drafts', async () => {
  const target = artifact();
  const { fetcher, calls } = fixture([artifact('2026-09-21-stale.json'), target]);
  const result = await readCloudDrafts({ now, fetcher });
  assert.deepEqual(result, { date: '2026-09-22', commit, artifacts: [{ commit, path: target.entry.path, blobSha: target.entry.sha,
    sha256: createHash('sha256').update(target.bytes).digest('hex'), article }] });
  assert.equal(calls.length, 3);
  for (const { options } of calls) {
    assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
    assert.equal(options.headers.authorization, undefined); assert.ok(options.signal instanceof AbortSignal);
  }
});

test('no files for today returns empty, while more than two fails visibly', async () => {
  assert.deepEqual(await readCloudDrafts({ now, fetcher: fixture([artifact('2026-09-21-old.json')]).fetcher }), { date: '2026-09-22', commit, artifacts: [] });
  const { fetcher, calls } = fixture(['a', 'b', 'c'].map(name => artifact(`2026-09-22-${name}.json`)));
  await assert.rejects(readCloudDrafts({ now, fetcher }), /CLOUD_DRAFT_LIMIT_EXCEEDED/);
  assert.equal(calls.length, 2);
});

test('rejects traversal, wrong directory, non-ASCII filename, symlink and oversized artifact', async () => {
  for (const update of [
    { name: '2026-09-22-../escape.json' }, { path: 'other/articles/2026-09-22-a-draft.json' },
    { name: '2026-09-22-café.json' }, { type: 'symlink' }, { size: 256 * 1024 + 1 },
  ]) {
    const item = artifact(); Object.assign(item.entry, update);
    await assert.rejects(readCloudDrafts({ now, fetcher: fixture([item]).fetcher }), /CLOUD_DRAFT_INVALID_ARTIFACT/);
  }
});

test('verifies Git object hash, advertised byte count and JSON object shape', async () => {
  const mismatch = artifact(); mismatch.blob.content = Buffer.from('{"title":"Other draft","image_url":null}').toString('base64');
  await assert.rejects(readCloudDrafts({ now, fetcher: fixture([mismatch]).fetcher }), /CLOUD_DRAFT_(HASH_MISMATCH|INVALID_BLOB)/);
  const hashMismatch = artifact(); hashMismatch.entry.sha = hashMismatch.blob.sha = 'b'.repeat(40);
  await assert.rejects(readCloudDrafts({ now, fetcher: fixture([hashMismatch]).fetcher }), /CLOUD_DRAFT_HASH_MISMATCH/);
  await assert.rejects(readCloudDrafts({ now, fetcher: fixture([artifact(undefined, [])]).fetcher }), /CLOUD_DRAFT_INVALID_ARTICLE/);
});

test('accepts valid large bounded artifacts without base64 regular-expression stack overflow', async () => {
  const large = artifact(undefined, { body: 'x'.repeat(240 * 1024) });
  const result = await readCloudDrafts({ now, fetcher: fixture([large]).fetcher });
  assert.equal(result.artifacts[0].article.body.length, 240 * 1024);
});

test('remote download URLs never select another repository or host', async () => {
  const item = artifact(); item.entry.download_url = 'https://evil.example/steal'; item.entry.url = `${api}-wrong/contents/file`;
  const { fetcher, calls } = fixture([item]);
  await readCloudDrafts({ now, fetcher });
  assert.ok(calls.every(({ url }) => url.startsWith(`${api}/`)));
});

test('rejects redirects and response origin changes', async () => {
  for (const response of [new Response(null, { status: 302, headers: { location: 'https://evil.example' } }),
    Object.defineProperty(Response.json({}), 'url', { value: 'https://api.github.com/repos/other/repo' })]) {
    await assert.rejects(readCloudDrafts({ now, fetcher: async () => response }), /CLOUD_DRAFT_UNEXPECTED_REDIRECT/);
  }
});

test('bounds response streams and fails explicit rate limits without retries', async () => {
  for (const response of [new Response(' '.repeat(16_385)), new Response('{}', { headers: { 'content-length': '20000' } })]) {
    await assert.rejects(readCloudDrafts({ now, fetcher: async () => response }), /CLOUD_DRAFT_RESPONSE_TOO_LARGE/);
  }
  for (const response of [new Response('', { status: 429 }), new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '0' } })]) {
    let calls = 0;
    await assert.rejects(readCloudDrafts({ now, fetcher: async () => { calls++; return response; } }), /CLOUD_DRAFT_RATE_LIMITED/);
    assert.equal(calls, 1);
  }
});

test('bad ref, truncated listing, timeout and arbitrary upstream errors fail safely', async () => {
  await assert.rejects(readCloudDrafts({ now, fetcher: fixture(undefined, (body, call) => { if (call === 1) body.ref = 'refs/heads/other'; }).fetcher }), /CLOUD_DRAFT_INVALID_COMMIT/);
  await assert.rejects(readCloudDrafts({ now, fetcher: fixture(Array.from({ length: 1000 }, () => artifact('2026-09-21-old.json'))).fetcher }), /CLOUD_DRAFT_INVALID_LISTING/);
  await assert.rejects(readCloudDrafts({ now, fetcher: async () => { throw new DOMException('upstream data', 'TimeoutError'); } }), /^Error: CLOUD_DRAFT_FETCH_TIMEOUT$/);
  await assert.rejects(readCloudDrafts({ now, fetcher: async () => { throw new Error('private upstream detail'); } }), /^Error: CLOUD_DRAFT_FETCH_FAILED$/);
});
