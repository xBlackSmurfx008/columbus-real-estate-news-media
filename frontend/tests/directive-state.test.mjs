import assert from 'node:assert/strict';
import test from 'node:test';
import {
  foldEvents,
  loadEvents,
  validateEvent,
  OWNER_QUEUE_CAP,
  ENGINEERING_STALE_DAYS,
  SCHEMA,
} from '../scripts/directive-state.mjs';

const engineering = (item, at, extra = {}) => ({
  schema: SCHEMA, item, at, actor: 'cmo-weekly', type: 'open', kind: 'engineering', status: 'proposed',
  title: 't', why: 'w', definition_of_done: 'd', verify: 'v', ...extra,
});
const owner = (item, at, extra = {}) => ({
  schema: SCHEMA, item, at, actor: 'cmo-weekly', type: 'open', kind: 'owner', status: 'asked',
  title: 't', question: 'q?', cost_of_delay: 'c', default_if_unanswered: 'park', ...extra,
});
const update = (item, at, extra) => ({ schema: SCHEMA, item, at, actor: 'cmo-weekly', type: 'update', ...extra });

test('the committed directive event log folds without errors', () => {
  const state = foldEvents(loadEvents(new URL('../../directives/events/', import.meta.url)));
  assert.deepEqual(state.errors, []);
  assert.ok(state.ownerQueue.length <= OWNER_QUEUE_CAP);
});

test('status changes must follow the lifecycle', () => {
  const state = foldEvents([
    engineering('a', '2026-09-01'),
    update('a', '2026-09-02', { status: 'verified', evidence: { url: 'https://example.test/pr/1' } }),
  ]);
  assert.match(state.errors.join('\n'), /cannot move proposed -> verified/);
});

test('verified and shipped require real evidence', () => {
  assert.match(validateEvent(update('a', '2026-09-02', { status: 'verified' })).join(), /verified requires evidence/);
  assert.match(validateEvent(update('a', '2026-09-02', { status: 'verified', evidence: { command: 'x', exit_code: 1 } })).join(), /verified requires evidence/);
  assert.deepEqual(validateEvent(update('a', '2026-09-02', { status: 'verified', evidence: { command: 'x', exit_code: 0 } })), []);
  assert.match(validateEvent(update('a', '2026-09-02', { status: 'shipped', evidence: { command: 'x', exit_code: 0 } })).join(), /shipped requires/);
});

test('events may not carry contact details', () => {
  assert.match(validateEvent(owner('b', '2026-09-01', { note: 'reply to someone@example.com' })).join(), /email address or phone/);
  assert.match(validateEvent(owner('b', '2026-09-01', { note: 'call 614-555-0123' })).join(), /email address or phone/);
  assert.deepEqual(validateEvent(owner('b', '2026-09-01', { note: 'lead #24' })), []);
});

test('the owner queue is capped', () => {
  const events = Array.from({ length: OWNER_QUEUE_CAP + 1 }, (_, index) => owner(`o${index}`, '2026-09-01'));
  assert.match(foldEvents(events).errors.join(), /owner queue has/);
});

test('a stalled engineering directive is flagged instead of silently re-issued', () => {
  const state = foldEvents([engineering('slow', '2026-09-01')], { asOf: '2026-09-20' });
  assert.ok(ENGINEERING_STALE_DAYS <= 19);
  assert.match(state.flags.join(), /slow: proposed for 19 days/);
});

test('ages and the state hash come from the log, independent of file order', () => {
  const events = [engineering('x', '2026-09-01'), update('x', '2026-09-05', { status: 'in_build' })];
  const forward = foldEvents(events, { asOf: '2026-09-10' });
  const reversed = foldEvents([...events].reverse(), { asOf: '2026-09-10' });
  assert.equal(forward.items[0].ageDays, 9);
  assert.equal(forward.items[0].daysInStatus, 5);
  assert.equal(forward.stateHash, reversed.stateHash);
});
