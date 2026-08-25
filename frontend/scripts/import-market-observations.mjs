#!/usr/bin/env node
// Imports verified market observations from a JSON array after strict provenance checks.
// Usage: DATABASE_URL=... node scripts/import-market-observations.mjs observations.json

import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { validateMarketObservation } from './market-observation-lib.mjs';

const filePath = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;
if (!filePath) {
  console.error('Usage: node scripts/import-market-observations.mjs observations.json');
  process.exit(1);
}
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const observations = JSON.parse(readFileSync(filePath, 'utf8'));
if (!Array.isArray(observations) || observations.length === 0) {
  console.error('Input must be a non-empty JSON array');
  process.exit(1);
}

const validationErrors = observations.flatMap((observation, index) =>
  validateMarketObservation(observation).map((error) => `row ${index}: ${error}`));
if (validationErrors.length > 0) {
  console.error(`Market import blocked:\n${validationErrors.join('\n')}`);
  process.exit(1);
}

const sql = neon(databaseUrl);
const sourceRows = await sql`SELECT slug FROM market_sources WHERE active = true`;
const validSources = new Set(sourceRows.map((source) => source.slug));
const unknownSources = [...new Set(observations.map((observation) => observation.source_slug)
  .filter((source) => !validSources.has(source)))];
if (unknownSources.length > 0) {
  console.error(`Unknown or inactive source_slug: ${unknownSources.join(', ')}`);
  process.exit(1);
}

let imported = 0;
for (const observation of observations) {
  await sql`
    INSERT INTO market_observations (
      metric_key, label, value_display, value_numeric, unit,
      geography_type, geography_slug, geography_label, property_type,
      period_start, period_end, as_of_date, source_slug, source_url,
      methodology_url, notes, quality_status, updated_at
    ) VALUES (
      ${observation.metric_key}, ${observation.label}, ${observation.value_display},
      ${observation.value_numeric ?? null}, ${observation.unit ?? null},
      ${observation.geography_type}, ${observation.geography_slug}, ${observation.geography_label},
      ${observation.property_type}, ${observation.period_start ?? null}, ${observation.period_end},
      ${observation.as_of_date}, ${observation.source_slug}, ${observation.source_url},
      ${observation.methodology_url ?? null}, ${observation.notes ?? null}, 'verified', NOW()
    )
    ON CONFLICT (metric_key, geography_slug, property_type, period_end, source_slug)
    DO UPDATE SET
      label = EXCLUDED.label,
      value_display = EXCLUDED.value_display,
      value_numeric = EXCLUDED.value_numeric,
      unit = EXCLUDED.unit,
      geography_type = EXCLUDED.geography_type,
      geography_label = EXCLUDED.geography_label,
      period_start = EXCLUDED.period_start,
      as_of_date = EXCLUDED.as_of_date,
      source_url = EXCLUDED.source_url,
      methodology_url = EXCLUDED.methodology_url,
      notes = EXCLUDED.notes,
      quality_status = 'verified',
      updated_at = NOW()
  `;
  imported += 1;
}

console.log(`${imported} sourced market observations imported.`);
