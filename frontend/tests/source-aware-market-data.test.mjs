import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FRED_FEED,
  buildMortgageObservation,
  buildZillowObservations,
  getCityAreas,
  getNeighborhoodAreas,
} from '../scripts/source-aware-market-data-lib.mjs';
import { validateMarketObservation } from '../scripts/market-observation-lib.mjs';

const zillowCsv = [
  'RegionName,State,Metro,2026-06-30,2026-07-31',
  'Columbus,OH,"Columbus, OH",320000,325000',
  'German Village,OH,"Columbus, OH",410000,415000',
  'Toledo,OH,"Toledo, OH",180000,181000',
].join('\n');

test('Zillow city and neighborhood feeds produce scoped verified observations', () => {
  const city = buildZillowObservations(zillowCsv, {
    metricKey: 'typical-home-value',
    label: 'Typical home value',
    propertyType: 'all-residential',
    sourceUrl: 'https://example.com/zillow.csv',
    notes: 'Test fixture',
  }, '2026-08-28', getCityAreas(), 'city');
  const neighborhood = buildZillowObservations(zillowCsv, {
    metricKey: 'typical-home-value',
    label: 'Typical home value',
    propertyType: 'all-residential',
    sourceUrl: 'https://example.com/zillow.csv',
    notes: 'Test fixture',
  }, '2026-08-28', getNeighborhoodAreas(), 'neighborhood');

  assert.equal(city.length, 1);
  assert.equal(city[0].geography_slug, 'columbus-citywide');
  assert.equal(city[0].value_numeric, 325000);
  assert.equal(neighborhood.length, 1);
  assert.equal(neighborhood[0].geography_slug, 'german-village');
  assert.equal(neighborhood[0].geography_type, 'neighborhood');
  assert.deepEqual(validateMarketObservation(neighborhood[0]), []);
});

test('mortgage feed produces a national observation with source provenance', () => {
  const observation = buildMortgageObservation('observation_date,MORTGAGE30US\n2026-08-21,6.85\n2026-08-28,.\n', '2026-08-28');
  assert.equal(observation?.source_url, FRED_FEED);
  assert.equal(observation?.period_end, '2026-08-21');
  assert.equal(observation?.value_display, '6.85%');
  assert.deepEqual(validateMarketObservation(observation), []);
});
