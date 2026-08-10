import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveArticleTags } from '../scripts/migrate-article-tags.mjs';

test('development stories receive topic, area, and Development tags', () => {
  assert.deepEqual(
    deriveArticleTags({ category: 'Development', topic_slug: 'development', area_slug: 'franklinton' }),
    ['columbus-ohio', 'central-ohio-real-estate', 'development', 'franklinton'],
  );
});

test('neighborhood stories receive neighborhood and residential tags', () => {
  assert.deepEqual(
    deriveArticleTags({ category: 'Neighborhoods', topic_slug: 'market-trends', area_slug: 'clintonville' }),
    ['columbus-ohio', 'central-ohio-real-estate', 'market-trends', 'clintonville', 'neighborhood', 'residential'],
  );
});
