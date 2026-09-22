import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertLiveImageCleanupPreflight, journalLiveImageUpload } from '../scripts/live-image-cleanup-store.mjs';

const records = [{ id: 'a', sha256: 'a'.repeat(64), perceptual_hash: 'a'.repeat(16) },
  { id: 'b', sha256: 'b'.repeat(64), perceptual_hash: 'b'.repeat(16) }];
const jobs = records.map(row => ({ article_id: row.id }));
test('preflight rejects a missing image job before upload authority exists', () => {
  assert.throws(() => assertLiveImageCleanupPreflight({ records, fingerprints: [], jobs: jobs.slice(0, 1) }), /IMAGE_JOB_REQUIRED:b/);
});
test('preflight rejects stale SHA ownership inside or outside the cleanup batch', () => {
  for (const owner of ['b', 'outside']) {
    assert.throws(() => assertLiveImageCleanupPreflight({ records, jobs,
      fingerprints: [{ article_id: owner, sha256: records[0].sha256 }] }), /IMAGE_SHA_OWNERSHIP_CONFLICT/);
  }
  assert.doesNotThrow(() => assertLiveImageCleanupPreflight({ records, jobs,
    fingerprints: records.map(row => ({ article_id: row.id, sha256: row.sha256 })) }));
});
test('each upload receipt is appended, fsynced, then closed before the caller can verify delivery', async () => {
  const calls = []; const receipt = { article_id: 'a', image_url: 'https://fixture.example.test/a.webp', sha256: records[0].sha256 };
  await journalLiveImageUpload('/fixture/uploads.jsonl', receipt, async (path, flags, mode) => {
    calls.push(['open', path, flags, mode]);
    return { writeFile: async (...args) => calls.push(['write', ...args]), sync: async () => calls.push(['sync']),
      close: async () => calls.push(['close']) };
  });
  assert.deepEqual(calls.map(call => call[0]), ['open', 'write', 'sync', 'close']);
  assert.equal(calls[0][3], 0o600); assert.equal(calls[1][1], `${JSON.stringify(receipt)}\n`);
});
test('journal failure closes the file and rejects so readback or another upload cannot continue', async () => {
  let closed = false;
  await assert.rejects(journalLiveImageUpload('/fixture/uploads.jsonl', {}, async () => ({
    writeFile: async () => {}, sync: async () => { throw new Error('DISK_FAILURE'); }, close: async () => { closed = true; },
  })), /DISK_FAILURE/);
  assert.equal(closed, true);
});
test('CLI performs ownership preflight before uploads and journals each put before readback', async () => {
  const source = await readFile(new URL('../scripts/apply-live-image-cleanup.mjs', import.meta.url), 'utf8');
  const preflight = source.indexOf('assertLiveImageCleanupPreflight({');
  const upload = source.indexOf('const blob = await put(');
  const journal = source.indexOf('await journalLiveImageUpload(');
  const readback = source.indexOf('const delivery = await fetch(blob.url');
  assert.ok(preflight > 0 && preflight < upload && upload < journal && journal < readback);
  assert.match(source, /await verifyLiveImageCleanup/);
});
