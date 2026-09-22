import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadNewsroomHealth } from '../scripts/newsroom-health-store.mjs';

test('collector executes only one read and returns bounded sanitized stage data without private receipt content', async () => {
  const now = new Date('2026-09-22T18:00:00Z'); let queries = 0;
  const sql = async strings => {
    queries++; assert.doesNotMatch(strings.join(''), /\b(INSERT|UPDATE|DELETE|CREATE|ALTER)\b/);
    return [{ snapshot: { lastCompletedRunAt: now.toISOString(), runningRuns: 0, failedRunsSinceLastCompletion: 0,
      draftCount: 0, actionableDraftCount: 0, oldestDraftAt: null, oldestRunningRunAt: null, lastPublicationAt: now.toISOString(),
      stages: { imports: { pending: 0, blocked: 1, lastAttemptAt: now.toISOString(), problems: [{ path: 'private/secret-file', code: 'provider body with private information' }] },
        corrections: { pending: 2, readyForProof: 1 }, proofs: { pending: 0 }, images: { pending: 0 }, publication: { pending: 0 } } } }];
  };
  const result = await loadNewsroomHealth(sql, { now, env: { CREN_CLOUD_IMPORT_ENABLED: 'true' } });
  assert.equal(queries, 1); assert.equal(result.ok, false);
  assert.equal(result.stages.corrections.manualRequired, 1);
  assert.deepEqual(result.stages.imports.problems, [{ path: 'REDACTED_ARTIFACT_PATH', code: 'REVIEW_REQUIRED' }]);
  assert.doesNotMatch(JSON.stringify(result), /secret-file|private information/);
});

test('CLI, cron and control tower share one collector; UI separates scheduler and newsroom health', async () => {
  const files = ['scripts/newsroom-automation-health.mjs', 'app/api/cron/newsroom-health/route.ts', 'src/agent/workflows/control-tower.ts'];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(source, /loadNewsroomHealth/); assert.doesNotMatch(source, /MAX\(created_at\).*last_publication_at/);
  }
  const page = await readFile(new URL('../app/(admin)/admin/operations/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /data\.scheduledHeartbeatHealthy/); assert.match(page, /data\.newsroomHealth\.ok/);
  assert.match(page, /independent of scheduler heartbeat/); assert.match(page, /awaiting owner review/);
  assert.match(page, /requiring supervised correction/);
});
