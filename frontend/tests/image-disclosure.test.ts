import assert from 'node:assert/strict';
import test from 'node:test';
import { imageDisclosure } from '../lib/image-disclosure.ts';

test('AI disclosure is visible and does not imply a site photograph', () => {
  assert.equal(imageDisclosure('AI-generated illustration; not a photograph.'), 'AI illustration · not the actual property or event');
});
test('archival, rendering and unknown provenance remain distinct', () => {
  assert.equal(imageDisclosure('Archival context: buildings in 2018.'), 'Archival photo · see caption for context');
  assert.equal(imageDisclosure('Official rendering of a proposal.'), 'Rendering · not a completed-project photograph');
  assert.equal(imageDisclosure('No known provenance'), null);
  assert.equal(imageDisclosure(null), null);
});
