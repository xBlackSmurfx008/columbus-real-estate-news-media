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

const healthy = () => ({ lastCompletedRunAt: now.toISOString(), oldestRunningRunAt: null, runningRuns: 0,
  failedRunsSinceLastCompletion: 0, draftCount: 0, oldestDraftAt: null, lastPublicationAt: now.toISOString() });

test('each durable handoff failure is unhealthy even when the newsroom run and publication are recent', () => {
  const cases = [
    ['imports', { blocked: 1 }, 'CLOUD_IMPORT_BLOCKED'], ['imports', { failed: 1 }, 'CLOUD_IMPORT_FAILED'],
    ['imports', { enabled: true, lastAttemptAt: null }, 'CLOUD_IMPORT_MISSED'],
    ['images', { blocked: 1 }, 'IMAGE_BLOCKED'], ['images', { failed: 1 }, 'IMAGE_FAILED'],
    ['images', { expiredLeases: 1 }, 'IMAGE_STUCK'], ['corrections', { blocked: 1 }, 'CORRECTION_BLOCKED'],
    ['corrections', { expiredLeases: 1 }, 'CORRECTION_STUCK'],
    ['publication', { blocked: 1 }, 'PUBLICATION_BLOCKED'],
    ['publication', { bookkeepingFailures: 1 }, 'PUBLICATION_BOOKKEEPING_FAILED'],
  ];
  for (const [name, stage, reason] of cases) {
    const report = assessNewsroomAutomationHealth({ ...healthy(), stages: { [name]: { pending: 0, ...stage } } }, { now });
    assert.equal(report.ok, false, reason); assert.ok(report.reasons.includes(reason), reason);
  }
});

test('pipeline stages become overdue after the boundary, while a normal owner wait is not a stuck draft', () => {
  const atBoundary = new Date(now.getTime() - 150 * 60_000).toISOString();
  const beforeBoundary = new Date(now.getTime() - 150 * 60_000 - 1).toISOString();
  for (const [stage, reason] of [['imports', 'CLOUD_IMPORT_STUCK'], ['images', 'IMAGE_STUCK'],
    ['proofs', 'PROOF_DELIVERY_STUCK'], ['corrections', 'CORRECTION_STUCK'], ['publication', 'PUBLICATION_PROCESSING_STUCK']]) {
    const snapshot = { ...healthy(), stages: { [stage]: { pending: 1, oldestPendingAt: atBoundary } } };
    assert.equal(assessNewsroomAutomationHealth(snapshot, { now }).ok, true, stage);
    snapshot.stages[stage].oldestPendingAt = beforeBoundary;
    assert.ok(assessNewsroomAutomationHealth(snapshot, { now }).reasons.includes(reason), stage);
  }
  const report = assessNewsroomAutomationHealth({ ...healthy(), draftCount: 1, actionableDraftCount: 0,
    stages: { proofs: { pending: 0, awaitingOwner: 1 }, corrections: { pending: 1, manualRequired: 1, oldestPendingAt: now.toISOString() } } }, { now });
  assert.equal(report.ok, true); assert.deepEqual(report.notices, ['AWAITING_OWNER_REVIEW', 'MANUAL_CORRECTION_REQUIRED']);
});

test('old ambiguous proof delivery requires reconciliation and is never treated as a new send authorization', () => {
  const report = assessNewsroomAutomationHealth({ ...healthy(), stages: { proofs: {
    pending: 1, sending: 1, oldestPendingAt: '2026-09-20T16:00:00Z', oldestSendingAt: '2026-09-20T16:00:00Z',
  } } }, { now });
  assert.ok(report.reasons.includes('PROOF_DELIVERY_RECONCILIATION_REQUIRED'));
});

test('invalid or future timestamps fail closed and invalid threshold configuration cannot hide failure', () => {
  for (const timestamp of ['not-a-date', '2027-09-21T16:00:00Z', null]) {
    const report = assessNewsroomAutomationHealth({ ...healthy(), lastCompletedRunAt: timestamp, lastPublicationAt: timestamp,
      stages: { proofs: { pending: 1, oldestPendingAt: timestamp } } }, {
      now, maxRunAgeHours: NaN, maxPublicationAgeHours: -1, maxStageAgeHours: Infinity,
    });
    assert.ok(report.reasons.includes('MISSED_NEWSROOM_RUN'));
    assert.ok(report.reasons.includes('PUBLICATION_STALE'));
    assert.ok(report.reasons.includes('PROOF_DELIVERY_STUCK'));
    assert.equal(report.metrics.lastPublicationAgeHours, null);
  }
});
