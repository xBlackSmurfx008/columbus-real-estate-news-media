import assert from 'node:assert/strict';
import test from 'node:test';
import { assessNewsroomAutomationHealth } from '../scripts/newsroom-run-policy.mjs';

const now = new Date('2026-09-21T16:00:00Z');

test('healthy newsroom accepts a recent no-story run and recent publication', () => {
  const result = assessNewsroomAutomationHealth({
    lastCompletedRunAt: '2026-09-21T10:30:00Z',
    oldestRunningRunAt: null,
    runningRuns: 0,
    failedRunsSinceLastCompletion: 0,
    draftCount: 0,
    oldestDraftAt: null,
    lastPublicationAt: '2026-09-20T16:00:00Z',
  }, { now });
  assert.equal(result.ok, true);
  assert.deepEqual(result.reasons, []);
});

test('health report exposes missed runs, stuck drafts, failures, and stale publication', () => {
  const result = assessNewsroomAutomationHealth({
    lastCompletedRunAt: '2026-09-18T10:00:00Z',
    oldestRunningRunAt: '2026-09-19T10:00:00Z',
    runningRuns: 1,
    failedRunsSinceLastCompletion: 2,
    draftCount: 3,
    oldestDraftAt: '2026-09-19T12:00:00Z',
    lastPublicationAt: '2026-09-15T12:00:00Z',
  }, { now });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reasons, [
    'MISSED_NEWSROOM_RUN',
    'STUCK_NEWSROOM_RUN',
    'FAILED_NEWSROOM_RUN',
    'STUCK_DRAFT',
    'PUBLICATION_STALE',
  ]);
});
