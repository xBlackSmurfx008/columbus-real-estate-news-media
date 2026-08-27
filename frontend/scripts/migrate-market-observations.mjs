#!/usr/bin/env node
// Creates the source-aware market data layer. This migration does not invent
// or copy legacy figures; observations are visible only after sourced import.

import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS market_sources (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    methodology_url TEXT,
    source_type TEXT NOT NULL,
    update_cadence TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS market_observations (
    id BIGSERIAL PRIMARY KEY,
    metric_key TEXT NOT NULL,
    label TEXT NOT NULL,
    value_display TEXT NOT NULL,
    value_numeric NUMERIC,
    unit TEXT,
    geography_type TEXT NOT NULL,
    geography_slug TEXT NOT NULL,
    geography_label TEXT NOT NULL,
    property_type TEXT NOT NULL DEFAULT 'all-residential',
    period_start DATE,
    period_end DATE NOT NULL,
    as_of_date DATE NOT NULL,
    source_slug TEXT NOT NULL REFERENCES market_sources(slug),
    source_url TEXT NOT NULL,
    methodology_url TEXT,
    notes TEXT,
    quality_status TEXT NOT NULL DEFAULT 'verified',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT market_observations_quality_check
      CHECK (quality_status IN ('draft', 'verified', 'superseded', 'rejected'))
  )
`;

await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS market_observations_series_period_unique
  ON market_observations (metric_key, geography_slug, property_type, period_end, source_slug)
`;
await sql`
  CREATE INDEX IF NOT EXISTS market_observations_latest_idx
  ON market_observations (geography_slug, metric_key, period_end DESC)
  WHERE quality_status = 'verified'
`;

const sources = [
  ['columbus-realtors', 'Columbus REALTORS', 'https://columbusrealtors.com/', 'https://columbusrealtors.com/', 'local-mls', 'monthly'],
  ['freddie-mac-pmms', 'Freddie Mac PMMS', 'https://www.freddiemac.com/pmms', 'https://www.freddiemac.com/pmms', 'national-mortgage-survey', 'weekly'],
  ['zillow-research', 'Zillow Research', 'https://www.zillow.com/research/data/', 'https://www.zillow.com/research/tag/zillow-home-value-index/', 'modeled-housing-index', 'monthly'],
  ['redfin-data-center', 'Redfin Data Center', 'https://www.redfin.com/news/data-center/', 'https://www.redfin.com/news/data-center/methodology/', 'brokerage-market-dataset', 'weekly-and-monthly'],
];

for (const source of sources) {
  await sql`
    INSERT INTO market_sources (slug, name, source_url, methodology_url, source_type, update_cadence)
    VALUES (${source[0]}, ${source[1]}, ${source[2]}, ${source[3]}, ${source[4]}, ${source[5]})
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      source_url = EXCLUDED.source_url,
      methodology_url = EXCLUDED.methodology_url,
      source_type = EXCLUDED.source_type,
      update_cadence = EXCLUDED.update_cadence,
      active = true,
      updated_at = NOW()
  `;
}

console.log('Source-aware market observation tables and source registry are ready.');
