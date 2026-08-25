import assert from 'node:assert/strict';
import test from 'node:test';
import { validateMarketObservation } from '../scripts/market-observation-lib.mjs';

const completeObservation = {
  metric_key: 'average-rent-apartment',
  label: 'Average apartment rent',
  value_display: '$1,500',
  value_numeric: 1500,
  geography_type: 'neighborhood',
  geography_slug: 'german-village',
  geography_label: 'German Village',
  property_type: 'apartment',
  period_start: '2026-07-01',
  period_end: '2026-07-31',
  as_of_date: '2026-08-20',
  source_slug: 'example-source',
  source_url: 'https://example.com/source',
};

test('complete source-aware market observations pass validation', () => {
  assert.deepEqual(validateMarketObservation(completeObservation), []);
});

test('observations fail closed without provenance and coherent dates', () => {
  const errors = validateMarketObservation({
    ...completeObservation,
    source_url: 'http://example.com/source',
    period_start: '2026-09-01',
    period_end: '2026-08-01',
    as_of_date: '2026-07-01',
  });
  assert.ok(errors.includes('source_url must use HTTPS'));
  assert.ok(errors.includes('period_start cannot be after period_end'));
  assert.ok(errors.includes('as_of_date cannot be before period_end'));
});
