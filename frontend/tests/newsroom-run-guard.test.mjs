import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessSameDayRun,
  classifyStorySlot,
  easternDate,
  RUN_MODES,
} from '../scripts/newsroom-run-guard-lib.mjs';

const RE_PATH = 'frontend/content/articles/2026-10-01-one-twenty-vine-arena-district-apartments.json';
const LIFE_PATH = 'frontend/content/articles/2026-10-01-hops-on-high-short-north.json';
const realEstate = { category: 'Development', topic_slug: 'development' };
const lifestyle = { category: 'Lifestyle', topic_slug: 'events-lifestyle' };

test('eastern date rolls over on New York midnight, not UTC midnight', () => {
  assert.equal(easternDate(new Date('2026-10-02T03:59:00Z')), '2026-10-01');
  assert.equal(easternDate(new Date('2026-10-02T04:01:00Z')), '2026-10-02');
  assert.throws(() => easternDate(new Date('nonsense')), /INVALID_GUARD_TIME/);
});

test('lifestyle is recognised by topic slug or category; everything else is real estate', () => {
  assert.equal(classifyStorySlot(lifestyle), 'lifestyle');
  assert.equal(classifyStorySlot({ category: 'Events & Lifestyle' }), 'lifestyle');
  assert.equal(classifyStorySlot(realEstate), 'real_estate');
  assert.equal(classifyStorySlot({ category: 'Local Politics', topic_slug: 'local-politics' }), 'real_estate');
  assert.equal(classifyStorySlot(null), 'real_estate');
});

test('no receipt means a full run with both slots open', () => {
  const result = assessSameDayRun({ date: '2026-10-02' });
  assert.equal(result.mode, RUN_MODES.FULL_RUN);
  assert.equal(result.receipt_present, false);
  assert.deepEqual(result.open_slots, ['real_estate', 'lifestyle']);
});

test('one real-estate article on main leaves only the lifestyle slot open', () => {
  const receipt = { date: '2026-10-01', story_result: 'ARTIFACTS_COMMITTED', article_paths: [RE_PATH] };
  const result = assessSameDayRun({ date: '2026-10-01', receipt, articles: { [RE_PATH]: realEstate } });
  assert.equal(result.mode, RUN_MODES.SECOND_RUN);
  assert.deepEqual(result.filled_slots, ['real_estate']);
  assert.deepEqual(result.open_slots, ['lifestyle']);
  assert.match(result.instructions, /update today's receipt in place/);
});

test('one lifestyle article on main leaves the real-estate slot open', () => {
  const receipt = { date: '2026-10-01', story_result: 'ARTIFACTS_COMMITTED', article_paths: [LIFE_PATH] };
  const result = assessSameDayRun({ date: '2026-10-01', receipt, articles: { [LIFE_PATH]: lifestyle } });
  assert.deepEqual(result.open_slots, ['real_estate']);
});

test('two articles on main means the quota is met and nothing may be committed', () => {
  const receipt = { date: '2026-10-01', story_result: 'ARTIFACTS_COMMITTED', article_paths: [LIFE_PATH, RE_PATH] };
  const result = assessSameDayRun({
    date: '2026-10-01',
    receipt,
    articles: { [RE_PATH]: realEstate, [LIFE_PATH]: lifestyle },
  });
  assert.equal(result.mode, RUN_MODES.QUOTA_MET);
  assert.deepEqual(result.open_slots, []);
  assert.deepEqual(result.article_paths, [LIFE_PATH, RE_PATH].sort());
  assert.match(result.instructions, /Commit nothing/);
});

test('a receipt with no article reopens both slots and says why', () => {
  const receipt = { date: '2026-10-01', story_result: 'NO_QUALIFYING_STORY', article_paths: [] };
  const result = assessSameDayRun({ date: '2026-10-01', receipt });
  assert.equal(result.mode, RUN_MODES.SECOND_RUN);
  assert.deepEqual(result.open_slots, ['real_estate', 'lifestyle']);
  assert.match(result.notes.join(' '), /NO_QUALIFYING_STORY/);
});

test('an unreadable article is counted as the real-estate slot so it cannot be duplicated', () => {
  const receipt = { date: '2026-10-01', story_result: 'ARTIFACTS_COMMITTED', article_paths: [RE_PATH] };
  const result = assessSameDayRun({ date: '2026-10-01', receipt, articles: {} });
  assert.deepEqual(result.filled_slots, ['real_estate']);
  assert.match(result.notes.join(' '), /could not be read/);
});

test('a receipt whose date disagrees with its file name is flagged', () => {
  const receipt = { date: '2026-09-30', story_result: 'ARTIFACTS_COMMITTED', article_paths: [RE_PATH] };
  const result = assessSameDayRun({ date: '2026-10-01', receipt, articles: { [RE_PATH]: realEstate } });
  assert.match(result.notes.join(' '), /does not match the file date/);
  assert.throws(() => assessSameDayRun({ date: 'yesterday', receipt }), /INVALID_GUARD_DATE/);
});
