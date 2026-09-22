import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEditorialReviewEmail,
  classifyEditorialReply,
  editorialCandidateHash,
  extractReplyText,
  normalizeEmailAddress,
  type EditorialCandidate,
} from '../lib/editorial-email-review.ts';

const candidate: EditorialCandidate = {
  id: 'story-1',
  title: 'A precise Columbus headline',
  excerpt: 'A concise reader promise.',
  body: 'First paragraph.\n\n## What happens next\n\nRead the [source](https://example.com/source).',
  author: 'CREN Staff',
  date: '2026-09-21',
  category: 'Development',
  image_url: 'https://example.com/hero.webp',
  image_alt: 'A vacant development site.',
  tags: ['development'],
};

test('candidate fingerprint changes when exact copy or hero changes', () => {
  const original = editorialCandidateHash(candidate);
  assert.equal(editorialCandidateHash({ ...candidate }), original);
  assert.notEqual(editorialCandidateHash({ ...candidate, title: 'Changed' }), original);
  assert.notEqual(editorialCandidateHash({ ...candidate, image_url: 'https://example.com/other.webp' }), original);
  assert.notEqual(editorialCandidateHash({ ...candidate, image_caption: 'Changed attribution' }), original);
  assert.notEqual(editorialCandidateHash({ ...candidate, image_provenance: { type: 'LICENSED_PHOTO', credit: 'New credit' } }), original);
});

test('image caption and exact hero appear in both versions of the owner proof', () => {
  const caption = 'AI-generated illustration; not a photograph of the actual property or event.';
  const proof = buildEditorialReviewEmail({ ...candidate, image_caption: caption }, 5);
  assert.ok(proof.text.includes(`CAPTION: ${caption}`));
  assert.ok(proof.html.includes(caption));
  assert.ok(proof.text.includes(candidate.image_url));
  assert.ok(proof.html.includes(candidate.image_url));
});

test('reply parser accepts only a standalone explicit approval', () => {
  assert.deepEqual(classifyEditorialReply('APPROVE'), { decision: 'APPROVED', reply: 'APPROVE' });
  assert.equal(classifyEditorialReply('Approve this version.').decision, 'APPROVED');
  assert.equal(classifyEditorialReply('approved').decision, 'APPROVED');
  assert.equal(classifyEditorialReply('Approved this version!').decision, 'APPROVED');
  assert.equal(classifyEditorialReply('Approve after fixing the second paragraph.').decision, 'CHANGES_REQUESTED');
  assert.equal(classifyEditorialReply('Please change the headline.').decision, 'CHANGES_REQUESTED');
  assert.equal(classifyEditorialReply('   ').decision, 'EMPTY');
});

test('actual owner approval tolerates contact signature and folded Gmail history while preserving signature audit text', () => {
  const ownerReply = 'approved\n\nBest Regards,\n\nStephen Adams\nFounder x2\nCOO\nDigiwealth <https://digiwealth.io/>\nBlk Ai <http://BlkAi.org>\nOhio Tech Weeks <http://ohiotechweeks.com>\nLinkedIn <https://www.linkedin.com/in/xmr008x/>';
  const value = `${ownerReply}\n\nOn Tue, Sep 22, 2026 at 10:05 AM Columbus Real Estate News <\neditor@columbusrealestatenews.com> wrote:\nOriginal publication proof content.`;
  assert.deepEqual(classifyEditorialReply(value), { decision: 'APPROVED', reply: ownerReply });
  assert.match(classifyEditorialReply(value).reply, /Founder x2/);
  assert.doesNotMatch(classifyEditorialReply(value).reply, /Original publication/);
});

test('approval with conservative mobile or standard delimiter signature remains an approval request', () => {
  assert.equal(classifyEditorialReply('APPROVED\n\nSent from my iPhone').decision, 'APPROVED');
  assert.equal(classifyEditorialReply('APPROVE THIS VERSION\n\n-- \nStephen Adams\nCOO\nceo@example.test').decision, 'APPROVED');
});

test('conditional or mixed approval plus edits is never hidden inside a signature', () => {
  for (const value of [
    'Approved after fixing the headline.',
    'Approved this version, but change the final paragraph.',
    'APPROVED\nPlease use more contractions.\n\nBest Regards,\nStephen Adams',
    'APPROVED\n\nBest Regards,\nStephen Adams\nPlease correct the price.',
    'APPROVED\n\nBest Regards,\nStephen Adams\nThe figure is wrong.',
    'APPROVED\n\nBest Regards,\nStephen Adams\nChange Headline <https://example.test/>',
    'APPROVED\n\nSent from my iPhone\nUse more contractions.',
    'APPROVED\n\nThanks,\nPlease Revise',
    'APPROVED\n\nBest Regards,\nStephen Adams\nP.S. Remove the last sentence.',
  ]) assert.equal(classifyEditorialReply(value).decision, 'CHANGES_REQUESTED', value);
});

test('quoted approvals never turn an empty or editing reply into approval', () => {
  assert.equal(classifyEditorialReply('> APPROVED').decision, 'EMPTY');
  assert.equal(classifyEditorialReply('On Tue, Sep 22, 2026 CREN <\neditor@example.test> wrote:\nAPPROVE').decision, 'EMPTY');
  const edit = 'use more contractions\n\nBest Regards,\nStephen Adams';
  assert.deepEqual(classifyEditorialReply(`${edit}\n\nOn Tue, Sep 22, CREN <\neditor@example.test> wrote:\nAPPROVED`), { decision: 'CHANGES_REQUESTED', reply: edit });
});

test('reply parser removes quoted email history before storing requested edits', () => {
  const reply = 'Change 23 to twenty-three in the deck.\n\nOn Sep 21, CREN wrote:\n> old proof';
  assert.equal(extractReplyText(reply), 'Change 23 to twenty-three in the deck.');
});

test('sender normalization handles display names and casing', () => {
  assert.equal(normalizeEmailAddress('Owner <CEO@DigiWealth.io>'), 'ceo@digiwealth.io');
});

test('proof includes the full candidate, hero, edit loop, and explicit approval instruction', () => {
  const proof = buildEditorialReviewEmail(candidate, 3);
  assert.match(proof.subject, /CREN REVIEW v3/);
  assert.match(proof.text, /Reply with your edits in plain language/);
  assert.match(proof.text, /First paragraph/);
  assert.match(proof.text, /OWNER APPROVAL:/);
  assert.match(proof.html, /https:\/\/example\.com\/hero\.webp/);
  assert.match(proof.html, /Reply <strong>APPROVE<\/strong>/);
});

test('proof instructions authorize exact-version email publication only after security and article checks', () => {
  const proof = buildEditorialReviewEmail(candidate, 4);
  for (const content of [proof.text, proof.html]) {
    assert.match(content, /After corrections, you will receive a new proof to review/);
    assert.match(content, /reply APPROVE or APPROVED/);
    assert.match(content, /publishes this exact copy and hero automatically after sender verification, security, article and image checks pass/);
    assert.match(content, /If any check fails, the story stays a draft/);
    assert.match(content, /No separate image approval is needed; the image desk handles selection and quality checks/);
    assert.match(content, /Edits, silence or approval of an earlier proof do not authorize publication/);
    assert.doesNotMatch(content, /sign(?:ed)?[- ]in|admin|scorecard|20\/20|independent editorial assessment|confirm (?:your|that) approval/i);
    assert.doesNotMatch(content, /automatic(?:ally)? (?:correct|revis)|paid|model credits/i);
  }
});
