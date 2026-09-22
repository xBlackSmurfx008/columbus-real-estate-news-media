import test from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintSyncOptions, syncImageFingerprints } from '../scripts/sync-image-fingerprints.mjs';

const article = { id: 'a', status: 'live', image_url: 'https://fixture.public.blob.vercel-storage.com/a.webp', updated_at: '2026-09-22 12:00:00.123456+00' };
const hash = { sha256: 'a'.repeat(64), perceptualHash: 'a'.repeat(16) };
function fixture(extra = {}) {
  const snapshot = { generation: '10', articles: [article], fingerprints: [], ...extra };
  const calls = [];
  const sql = async (strings, ...values) => {
    const query = strings.join(''); calls.push({ query, values });
    return /WITH image_lock/.test(query) ? [{ count: snapshot.articles.length }] : [structuredClone(snapshot)];
  };
  return { sql, calls, snapshot };
}

test('CLI is read-only without an explicit apply flag and rejects contradictory/unknown flags', () => {
  assert.deepEqual(fingerprintSyncOptions([]), { apply: false });
  assert.deepEqual(fingerprintSyncOptions(['--dry-run']), { apply: false });
  assert.deepEqual(fingerprintSyncOptions(['--apply']), { apply: true });
  assert.throws(() => fingerprintSyncOptions(['--apply', '--dry-run']), /CONFLICTING/);
  assert.throws(() => fingerprintSyncOptions(['--write']), /UNKNOWN/);
});
test('default invocation only reads and reports missing fingerprints', async () => {
  const f = fixture();
  const report = await syncImageFingerprints(f.sql, { fingerprint: async () => hash });
  assert.equal(report.mode, 'dry-run'); assert.equal(report.wouldSync, 1); assert.equal(f.calls.length, 1);
  assert.deepEqual(report.cacheIssues, [{ articleId: 'a', reason: 'MISSING_CACHED_FINGERPRINT' }]);
  assert.doesNotMatch(f.calls[0].query, /CREATE|INSERT|UPDATE|DELETE/);
});
test('explicit apply refreshes reported malformed/stale cache after a complete fresh check', async () => {
  const f = fixture({ fingerprints: [{ article_id: 'a', image_url: 'old-url', sha256: 'invalid', perceptual_hash: null }] });
  const report = await syncImageFingerprints(f.sql, { apply: true, fingerprint: async () => hash });
  assert.equal(report.ok, true); assert.equal(report.synced, 1); assert.equal(f.calls.length, 2);
  assert.deepEqual(report.cacheIssues.map(item => item.reason), ['MALFORMED_CACHED_FINGERPRINT', 'STALE_CACHED_IMAGE_URL', 'STALE_CACHED_IMAGE_HASH']);
  assert.match(f.calls[1].query, /FOR UPDATE OF a/); assert.match(f.calls[1].query, /generation = generation \+ 1/);
});
test('invalid or unreachable fresh image blocks every write even with cached fingerprints', async () => {
  for (const value of [null, { sha256: 'a'.repeat(64), perceptualHash: 'invalid' }]) {
    const f = fixture();
    const report = await syncImageFingerprints(f.sql, { apply: true, fingerprint: async () => value });
    assert.equal(report.ok, false); assert.equal(report.synced, 0); assert.equal(f.calls.length, 1);
  }
});
test('out-of-scope malformed cache rows remain explicit blockers rather than being skipped', async () => {
  const f = fixture({ fingerprints: [{ article_id: 'other', image_url: 'old', sha256: 'bad', perceptual_hash: null }] });
  const report = await syncImageFingerprints(f.sql, { apply: true, fingerprint: async () => hash });
  assert.equal(report.ok, false); assert.equal(f.calls.length, 1);
  assert.equal(report.invalid[0].reason, 'FINGERPRINT_OUTSIDE_CHECKED_CORPUS');
  assert.equal(report.cacheIssues[0].reason, 'MALFORMED_CACHED_FINGERPRINT');
});
test('URL, byte and perceptual duplicates block all writes', async () => {
  for (const kind of ['URL', 'EXACT', 'NEAR']) {
    const other = { ...article, id: 'b', image_url: kind === 'URL' ? article.image_url : `${article.image_url}?other` };
    const f = fixture({ articles: [article, other] }); let n = 0;
    const report = await syncImageFingerprints(f.sql, { apply: true, fingerprint: async () => {
      n++; return { ...hash, sha256: n === 1 || kind === 'EXACT' ? hash.sha256 : 'b'.repeat(64) };
    } });
    assert.equal(report.duplicates[0].kind, kind); assert.equal(report.ok, false); assert.equal(f.calls.length, 1);
  }
});
test('CAS failure reports retry and never reports staged rows as synced', async () => {
  const f = fixture();
  const sql = async (strings, ...values) => /WITH image_lock/.test(strings.join('')) ? [{ count: 0 }] : f.sql(strings, ...values);
  const report = await syncImageFingerprints(sql, { apply: true, fingerprint: async () => hash });
  assert.equal(report.ok, false); assert.equal(report.synced, 0);
  assert.equal(report.invalid[0].reason, 'FINGERPRINT_SYNC_CHANGED_STATE_RETRY');
});
