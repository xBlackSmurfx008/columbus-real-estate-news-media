import assert from 'node:assert/strict';
import test from 'node:test';
import { planNewsroomCadence, enqueueNewsroomCadence } from '../lib/newsroom-cadence.ts';
import type { SqlClient } from '../src/agent/repositories/jobs.ts';

test('Eastern daily intent is preserved across daylight saving time', () => {
  for (const instant of ['2026-07-14T10:00:00Z', '2026-01-13T11:00:00Z']) {
    const jobs = planNewsroomCadence(new Date(instant), 0);
    assert.deepEqual(jobs.map((job) => job.payload.scheduleId), ['opening-check', 'news-event-scout']);
  }
});
test('weekly and monthly boundaries use local dates, not UTC dates', () => {
  const before = planNewsroomCadence(new Date('2026-10-01T02:00:00Z'), 0);
  assert.ok(before.every((job) => job.payload.localDate === '2026-09-30'));
  assert.ok(!before.some((job) => job.payload.cadence === 'monthly'));
  const first = planNewsroomCadence(new Date('2026-10-01T14:00:00Z'), 0);
  assert.ok(first.some((job) => job.payload.scheduleId === 'monthly-audit'));
  assert.ok(first.some((job) => job.payload.scheduleId === 'weekend-planner'));
});
test('bounded catch-up includes yesterday and never invents send authority', () => {
  const jobs = planNewsroomCadence(new Date('2026-09-22T09:00:00Z'));
  assert.ok(jobs.some((job) => job.payload.scheduleId === 'weekly-planning'));
  assert.ok(jobs.every((job) => job.payload.localDate === '2026-09-21'));
  assert.ok(jobs.every((job) => job.payload.authority === 'REVIEW_ONLY'));
  assert.throws(() => planNewsroomCadence(new Date(), 30), /INVALID_CADENCE_WINDOW/);
});
test('repeated ticks retain stable payloads and persistent dedupe keys', async () => {
  const records = new Map<string, Record<string, unknown>>();
  const sql: SqlClient = async (_strings, ...values) => {
    const [id, kind, dedupeKey, payload] = values as string[];
    if (!records.has(dedupeKey)) records.set(dedupeKey, { id, kind, dedupe_key: dedupeKey, payload: JSON.parse(payload) });
    return [records.get(dedupeKey)!];
  };
  const now = new Date('2026-09-22T14:00:00Z');
  const first = await enqueueNewsroomCadence(sql, now);
  const second = await enqueueNewsroomCadence(sql, new Date(now.getTime() + 60000));
  assert.deepEqual(first.map((job) => job.id), second.map((job) => job.id));
  assert.equal(records.size, first.length);
});
