import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mergePublicationCandidate, normalizeFactCheckedAt } from '../lib/publication-candidate.ts';
import { editorialCandidateHash, type EditorialCandidate } from '../lib/editorial-email-review.ts';
import { evaluateArticle } from '../scripts/editorial-quality-lib.mjs';

const fixture = JSON.parse(await readFile(new URL('../content/articles/2026-09-16-columbus-east-side-permanently-affordable-condos-community-land-trust.json', import.meta.url), 'utf8'));

test('Neon Date timestamp is normalized before the exact candidate editorial gate', () => {
  const persisted = { fact_checked_at: new Date('2026-09-16T18:00:00Z') };
  const candidate = mergePublicationCandidate(fixture, persisted);
  assert.equal(candidate.fact_checked_at, '2026-09-16T18:00:00.000Z');
  const report = evaluateArticle(candidate);
  assert.equal(report.passed, true, report.failedCodes.join(','));
  assert.ok(persisted.fact_checked_at instanceof Date);
  assert.equal(fixture.fact_checked_at, '2026-09-16T18:00:00Z');
});

test('equivalent Date, Z, fractional Z and timezone-offset timestamps bind the same artifact hash', () => {
  const base = { ...fixture, id: 'timestamp-fixture', image_url: 'https://example.test/image.webp' } as EditorialCandidate;
  const variants = [new Date('2026-09-16T18:00:00Z'), '2026-09-16T18:00:00Z', '2026-09-16T18:00:00.000Z', '2026-09-16T14:00:00-04:00'];
  const hashes = variants.map((fact_checked_at) => editorialCandidateHash({ ...base, fact_checked_at }));
  assert.equal(new Set(hashes).size, 1);
  assert.notEqual(editorialCandidateHash({ ...base, fact_checked_at: '2026-09-16T18:00:01Z' }), hashes[0]);
});

test('staged timestamps normalize without a persisted override; invalid Dates fail the gate', () => {
  assert.equal(mergePublicationCandidate(fixture, {}).fact_checked_at, '2026-09-16T18:00:00.000Z');
  assert.equal(normalizeFactCheckedAt(new Date('invalid')), null);
  assert.equal(evaluateArticle(mergePublicationCandidate(fixture, { fact_checked_at: new Date('invalid') })).passed, false);
});
