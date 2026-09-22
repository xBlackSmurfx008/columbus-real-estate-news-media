import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeSnapshotImages, syncSnapshotImages, SNAPSHOT_IMAGE_FIELDS } from '../scripts/snapshot-image-sync.mjs';

const fixture = () => ({ _meta: { generated_at: 'unchanged', market_fingerprint: 'untouched' },
  articles: [{ id: 'b', title: 'Original B', body: 'Unchanged body', updated_at: 'old', image_url: 'old-b', image_alt: 'old alt', image_caption: 'old caption' },
    { id: 'a', title: 'Original A', tags: ['one', 'two'], image_url: 'old-a', image_alt: null, image_caption: null }],
  ads: [{ id: 1, body: 'Original ad' }], settings: { brand: 'CREN' } });
const live = () => ['a', 'b', 'new-live-article'].map(id => ({ id, image_url: `https://example.org/${id}.webp`, image_alt: `Photo of ${id}`, image_caption: `Credit ${id}`, title: 'MUST NOT IMPORT', body: 'MUST NOT IMPORT' }));
const withoutImages = snapshot => ({ ...snapshot, articles: snapshot.articles.map(article => Object.fromEntries(Object.entries(article).filter(([key]) => !SNAPSHOT_IMAGE_FIELDS.includes(key)))) });

test('image merge preserves every non-image field, metadata, order and existing count', () => {
  const before = fixture(), original = structuredClone(before);
  const result = mergeSnapshotImages(before, live());
  assert.deepEqual(before, original, 'pure merge does not mutate input');
  assert.deepEqual(withoutImages(result.snapshot), withoutImages(original));
  assert.deepEqual(result.snapshot.articles.map(row => row.id), ['b', 'a']);
  assert.equal(result.articles, 2); assert.equal(result.changed, 2); assert.equal(result.ignoredLiveArticles, 1);
  assert.equal(result.snapshot.articles[0].image_url, 'https://example.org/b.webp');
  assert.equal(mergeSnapshotImages(result.snapshot, live()).changed, 0);
});

test('missing/deleted IDs, duplicate IDs, empty input and incomplete image rows fail closed', () => {
  assert.throws(() => mergeSnapshotImages(fixture(), live().filter(row => row.id !== 'b')), /SNAPSHOT_ARTICLE_NOT_LIVE/);
  assert.throws(() => mergeSnapshotImages(fixture(), [...live(), live()[0]]), /INVALID_LIVE_IMAGE_ROW/);
  assert.throws(() => mergeSnapshotImages({ articles: [] }, live()), /INVALID_IMAGE_SNAPSHOT_INPUT/);
  const repeated = fixture(); repeated.articles.push(repeated.articles[0]);
  assert.throws(() => mergeSnapshotImages(repeated, live()), /INVALID_SNAPSHOT_ARTICLE_ID/);
  const incomplete = live(); delete incomplete[0].image_alt;
  assert.throws(() => mergeSnapshotImages(fixture(), incomplete), /INVALID_LIVE_IMAGE_ROW/);
});

test('dry run never writes; explicit local apply changes only image fields and rejects changed snapshot', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'cren-snapshot-image-test-'));
  const path = join(directory, 'snapshot.json');
  const before = `${JSON.stringify(fixture(), null, 2)}\n`;
  writeFileSync(path, before);
  const sql = async strings => {
    assert.equal(strings.join(''), "SELECT id,image_url,image_alt,image_caption FROM articles WHERE status='live' ORDER BY id");
    return live();
  };
  try {
    const dry = await syncSnapshotImages(sql, path);
    assert.equal(dry.dryRun, true); assert.equal(dry.applied, 0);
    assert.equal(readFileSync(path, 'utf8'), before);
    const applied = await syncSnapshotImages(sql, path, { apply: true });
    assert.equal(applied.applied, 2);
    assert.deepEqual(withoutImages(JSON.parse(readFileSync(path, 'utf8'))), withoutImages(fixture()));
    assert.equal((await syncSnapshotImages(sql, path, { apply: true })).applied, 0);
    writeFileSync(path, before);
    await assert.rejects(syncSnapshotImages(async () => { writeFileSync(path, `${before} `); return live(); }, path, { apply: true }), /SNAPSHOT_CHANGED_DURING_IMAGE_SYNC/);
    assert.equal(readFileSync(path, 'utf8'), `${before} `);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('actual outage snapshot keeps all copy and payload when only image fields are merged', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../content/snapshot/public-data.json', import.meta.url), 'utf8'));
  const rows = snapshot.articles.map(row => ({ id: row.id, image_url: row.image_url, image_alt: row.image_alt ?? null, image_caption: row.image_caption ?? null }));
  const result = mergeSnapshotImages(snapshot, [...rows, { id: 'extra-test-id', image_url: null, image_alt: null, image_caption: null }]);
  assert.equal(result.articles, snapshot.articles.length);
  assert.deepEqual(withoutImages(result.snapshot), withoutImages(snapshot));
  assert.deepEqual(Object.keys(result.snapshot), Object.keys(snapshot));
});
