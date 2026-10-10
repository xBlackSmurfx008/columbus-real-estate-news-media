import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  dueWatchlistItems,
  openPhotoRequests,
  PHOTO_REQUESTS_SCHEMA,
  shotPhotoRequests,
  validatePhotoRequests,
  validateWatchlist,
  WATCHLIST_SCHEMA,
} from '../scripts/newsroom-ledgers-lib.mjs';

const readLedger = (name) => JSON.parse(readFileSync(new URL(`../../briefs/${name}`, import.meta.url), 'utf8'));

const watchItem = (overrides = {}) => ({
  id: 'sample-lead',
  lead: 'A pending decision',
  location: 'Somewhere in Columbus',
  primary_record: 'The minutes',
  primary_record_url: null,
  next_check: '2026-10-05',
  next_checkpoint: 'Minutes posting',
  status: 'PENDING',
  first_seen: '2026-10-01',
  last_checked: null,
  last_result: null,
  published_as: null,
  ...overrides,
});

const photoItem = (overrides = {}) => ({
  id: 'sample-site',
  address: '1 Example St.',
  area: 'Downtown Columbus',
  why: 'A verified lead',
  time_sensitive: false,
  requested_on: '2026-10-01',
  requested_by: 'newsroom receipt 2026-10-01',
  status: 'OPEN',
  shot_on: null,
  library_ref: null,
  used_in: [],
  ...overrides,
});

const watchDoc = (items) => ({ schema_version: WATCHLIST_SCHEMA, updated_at: '2026-10-02', items });
const photoDoc = (items) => ({ schema_version: PHOTO_REQUESTS_SCHEMA, updated_at: '2026-10-02', items });

test('the committed ledgers validate', () => {
  assert.deepEqual(validateWatchlist(readLedger('watchlist.json')), { ok: true, errors: [] });
  assert.deepEqual(validatePhotoRequests(readLedger('photo-requests.json')), { ok: true, errors: [] });
});

test('watchlist rejects duplicate ids, bad dates, and states that contradict their fields', () => {
  const result = validateWatchlist(
    watchDoc([
      watchItem(),
      watchItem({ id: 'sample-lead' }),
      watchItem({ id: 'no-date', next_check: 'soon' }),
      watchItem({ id: 'cleared-without-article', status: 'CLEARED', next_check: null }),
      watchItem({ id: 'dropped-silently', status: 'DROPPED', next_check: null, last_result: null }),
      watchItem({ id: 'pending-with-article', published_as: 'frontend/content/articles/2026-10-01-x.json' }),
    ]),
  );
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /"sample-lead" is duplicated/);
  assert.match(result.errors.join('\n'), /no-date.*next_check is required while PENDING/);
  assert.match(result.errors.join('\n'), /cleared-without-article.*published_as must be the article path/);
  assert.match(result.errors.join('\n'), /dropped-silently.*must say why/);
  assert.match(result.errors.join('\n'), /pending-with-article.*published_as must be null/);
});

test('watchlist accepts a cleared item with its article path and a dropped item with a reason', () => {
  const result = validateWatchlist(
    watchDoc([
      watchItem({
        id: 'shipped',
        status: 'CLEARED',
        next_check: null,
        published_as: 'frontend/content/articles/2026-10-03-shipped-story.json',
      }),
      watchItem({ id: 'gone', status: 'DROPPED', next_check: null, last_result: 'Developer withdrew the application.' }),
    ]),
  );
  assert.deepEqual(result, { ok: true, errors: [] });
});

test('due items are PENDING with next_check on or before the date, oldest first', () => {
  const doc = watchDoc([
    watchItem({ id: 'later', next_check: '2026-10-09' }),
    watchItem({ id: 'today', next_check: '2026-10-05' }),
    watchItem({ id: 'overdue', next_check: '2026-10-01' }),
    watchItem({ id: 'done', status: 'CLEARED', next_check: null, published_as: 'frontend/content/articles/2026-10-01-done.json' }),
  ]);
  assert.deepEqual(dueWatchlistItems(doc, '2026-10-05').map((item) => item.id), ['overdue', 'today']);
  assert.throws(() => dueWatchlistItems(doc, '10/05/2026'), /INVALID_LEDGER_DATE/);
});

test('photo requests reject duplicate addresses and SHOT entries without provenance', () => {
  const result = validatePhotoRequests(
    photoDoc([
      photoItem(),
      photoItem({ id: 'same-place', address: '1 EXAMPLE ST.' }),
      photoItem({ id: 'claims-shot', status: 'SHOT' }),
      photoItem({ id: 'bad-article', used_in: ['not-a-path'] }),
      photoItem({ id: 'no-urgency', time_sensitive: 'yes' }),
    ]),
  );
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /same-place.*address duplicates/);
  assert.match(result.errors.join('\n'), /claims-shot.*shot_on is required/);
  assert.match(result.errors.join('\n'), /claims-shot.*library_ref must name/);
  assert.match(result.errors.join('\n'), /bad-article.*used_in/);
  assert.match(result.errors.join('\n'), /no-urgency.*time_sensitive/);
});

test('open requests list time-sensitive sites first; shot requests list newest first', () => {
  const doc = photoDoc([
    photoItem({ id: 'routine', address: '2 Routine Ave.', requested_on: '2026-09-20' }),
    photoItem({ id: 'urgent', address: '3 Urgent Blvd.', time_sensitive: true, requested_on: '2026-09-27' }),
    photoItem({ id: 'older-shot', address: '4 Older St.', status: 'SHOT', shot_on: '2026-09-28', library_ref: '2026-09-28 run notes.txt' }),
    photoItem({ id: 'newer-shot', address: '5 Newer St.', status: 'SHOT', shot_on: '2026-10-01', library_ref: '2026-10-01 run notes.txt' }),
    photoItem({ id: 'dropped', address: '6 Dropped Ct.', status: 'DROPPED' }),
  ]);
  assert.deepEqual(validatePhotoRequests(doc), { ok: true, errors: [] });
  assert.deepEqual(openPhotoRequests(doc).map((item) => item.id), ['urgent', 'routine']);
  assert.deepEqual(shotPhotoRequests(doc).map((item) => item.id), ['newer-shot', 'older-shot']);
});
