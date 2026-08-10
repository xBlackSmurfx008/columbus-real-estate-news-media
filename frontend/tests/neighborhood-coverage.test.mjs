import assert from 'node:assert/strict';
import test from 'node:test';
import { easternWeekStart } from '../scripts/neighborhood-coverage-report.mjs';

test('neighborhood cadence uses a Monday start in Eastern time', () => {
  assert.equal(easternWeekStart(new Date('2026-08-10T13:00:00Z')), '2026-08-10');
  assert.equal(easternWeekStart(new Date('2026-08-16T23:00:00Z')), '2026-08-10');
});
