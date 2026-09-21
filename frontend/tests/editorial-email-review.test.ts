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
});

test('reply parser accepts only a standalone explicit approval', () => {
  assert.deepEqual(classifyEditorialReply('APPROVE'), { decision: 'APPROVED', reply: 'APPROVE' });
  assert.equal(classifyEditorialReply('Approve this version.').decision, 'APPROVED');
  assert.equal(classifyEditorialReply('Approve after fixing the second paragraph.').decision, 'CHANGES_REQUESTED');
  assert.equal(classifyEditorialReply('Please change the headline.').decision, 'CHANGES_REQUESTED');
  assert.equal(classifyEditorialReply('   ').decision, 'EMPTY');
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
  assert.match(proof.text, /PROPOSED EDITORIAL SCORECARD: 20\/20/);
  assert.match(proof.html, /https:\/\/example\.com\/hero\.webp/);
  assert.match(proof.html, /Reply <strong>APPROVE<\/strong>/);
});
