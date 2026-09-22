import test from 'node:test';
import assert from 'node:assert/strict';
import { manualRevision } from '../scripts/manual-editorial-correction.mjs';
import { editorialCandidateHash } from '../lib/editorial-email-review.ts';

const base = { id: 'manual-fixture', body: 'It is a proposal.', answer_summary: 'It is a proposal.',
  claim_ledger: [{ id: 'c1', claim: 'It is a proposal.', source_ids: ['s1'], kind: 'STATUS' }],
  source_ledger: [{ id: 's1', url: 'https://example.test/record' }], image_sha256: 'fixed-image' };
const plan = { articleId: base.id, baseHash: editorialCandidateHash(base),
  expectedCorrectionFirstLines: ['Use contractions'], explanation: 'Style only.', replacements: [
    { field: 'body', from: 'It is', to: "It's" },
    { field: 'answer_summary', from: 'It is', to: "It's" },
    { field: 'claim_ledger', claimId: 'c1', from: 'It is', to: "It's" },
  ] };
test('manual style edits preserve base, source attribution and image while keeping claim text aligned', () => {
  const result = manualRevision(plan, base, ['Use contractions\n\nSignature']);
  assert.equal(result.candidate.body, "It's a proposal.");
  assert.equal(result.candidate.answer_summary, result.candidate.body);
  assert.equal(result.candidate.claim_ledger[0].claim, result.candidate.body);
  assert.deepEqual(result.candidate.claim_ledger[0].source_ids, ['s1']);
  assert.deepEqual(result.candidate.source_ledger, base.source_ledger);
  assert.equal(result.candidate.image_sha256, base.image_sha256);
  assert.equal(base.body, 'It is a proposal.');
});
test('manual plan rejects changed artifact or correction list', () => {
  assert.throws(() => manualRevision(plan, { ...base, body: 'Changed' }, ['Use contractions']), /BASE_CHANGED/);
  assert.throws(() => manualRevision(plan, base, ['Publish now']), /CORRECTIONS_CHANGED/);
  assert.throws(() => manualRevision(plan, base, ['Use contractions', 'Another edit']), /CORRECTIONS_CHANGED/);
});
test('manual plan rejects protected fields, missing claims and missing or ambiguous copy matches', () => {
  const attempt = replacement => manualRevision({ ...plan, replacements: [replacement] }, base, ['Use contractions']);
  assert.throws(() => attempt({ field: 'source_ledger', from: 'x', to: 'y' }), /PROTECTED_FIELD/);
  assert.throws(() => attempt({ field: 'claim_ledger', claimId: 'missing', from: 'It is', to: "It's" }), /EXACT_CLAIM/);
  assert.throws(() => attempt({ field: 'body', from: 'missing', to: 'new' }), /AMBIGUOUS_REPLACEMENT/);
  const repeated = { ...base, body: 'It is a proposal. It is a proposal.' };
  assert.throws(() => manualRevision({ ...plan, baseHash: editorialCandidateHash(repeated) }, repeated, ['Use contractions']), /AMBIGUOUS_REPLACEMENT/);
});
