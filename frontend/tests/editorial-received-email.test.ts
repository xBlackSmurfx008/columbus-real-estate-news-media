import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchReceivedEditorialEmail, verifyReceivedEditorialReply, verifyReceivedEditorialApproval, type ReceivedEditorialEmail } from '../lib/editorial-received-email.ts';

const owner = 'owner@example.test';
const domain = 'review.example.test';
const token = 'a'.repeat(36);
const emailId = 'd137ef4a-b608-41c4-a699-6bebb92621e4';
const fixture = (overrides: Partial<ReceivedEditorialEmail> = {}): ReceivedEditorialEmail => ({
  id: emailId, from: 'Owner <owner@example.test>', to: [`editorial+${token}@${domain}`],
  text: 'Approved\n\nBest regards,\nAlex Example\nCEO', created_at: '2026-09-22T10:00:00Z',
  authentication: { spf: 'pass', dkim: 'pass', dmarc: 'pass' }, attachments: [], ...overrides,
});

test('provider fetch uses fixed destination, matching email id and no redirects', async () => {
  let calls = 0;
  const result = await fetchReceivedEditorialEmail(emailId, { apiKey: 'test-only', fetchImpl: async (url, init) => {
    calls++;
    assert.equal(String(url), `https://api.resend.com/emails/receiving/${emailId}?html_format=cid`);
    assert.equal(init?.redirect, 'error'); assert.ok(init?.signal); assert.equal(init?.cache, 'no-store');
    return Response.json(fixture());
  } });
  assert.equal(result.id, emailId); assert.equal(calls, 1);
  await assert.rejects(fetchReceivedEditorialEmail('../elsewhere', { apiKey: 'test-only' }), /INVALID_RECEIVED_EMAIL_ID/);
  await assert.rejects(fetchReceivedEditorialEmail(emailId, { apiKey: 'test-only', fetchImpl: async () => Response.json(fixture({ id: 'other' })) }), /RECEIVED_EMAIL_INVALID/);
});

test('provider response is bounded regardless of Content-Length and malformed JSON is rejected', async () => {
  await assert.rejects(fetchReceivedEditorialEmail(emailId, { apiKey: 'test-only', fetchImpl: async () => new Response('x'.repeat(2_000_001)) }), /TOO_LARGE/);
  await assert.rejects(fetchReceivedEditorialEmail(emailId, { apiKey: 'test-only', fetchImpl: async () => new Response('{broken') }), /INVALID/);
  await assert.rejects(fetchReceivedEditorialEmail(emailId, { apiKey: 'test-only', fetchImpl: async () => new Response('private provider detail', { status: 500 }) }), /^Error: RECEIVING_FETCH_FAILED$/);
});

test('exact owner, one current proof address and provider DKIM/DMARC evidence permit approval', () => {
  const result = verifyReceivedEditorialApproval(fixture(), owner, domain);
  assert.equal(result.token, token); assert.equal(result.sender, owner);
  assert.equal(result.authentication.source, 'resend-receiving-api');
  assert.equal(verifyReceivedEditorialApproval(fixture({ from: '"Example, Owner" <OWNER@example.test>' }), owner, domain).sender, owner);
});

test('corrections require the same verified owner and proof authority without becoming approvals', () => {
  const received = fixture({ text: 'Please correct the completion date.', authentication: { spf: 'fail', dkim: 'pass', dmarc: 'gray' } });
  const verified = verifyReceivedEditorialReply(received, owner, domain);
  assert.equal(verified.text, received.text);
  assert.equal(verified.token, token);
  assert.equal(verified.sender, owner);
  assert.throws(() => verifyReceivedEditorialApproval(received, owner, domain), /UNQUALIFIED_EMAIL_APPROVAL_REQUIRED/);
  for (const overrides of [
    { authentication: null },
    { authentication: { spf: 'pass', dkim: 'fail', dmarc: 'pass' } as ReceivedEditorialEmail['authentication'] },
    { authentication: { spf: 'pass', dkim: 'pass', dmarc: 'fail' } as ReceivedEditorialEmail['authentication'] },
    { from: 'attacker@example.test' },
    { from: 'Owner <owner@example.test>, Attacker <attacker@example.test>' },
    { to: [], received_for: [`editorial+${token}@${domain}`] },
    { to: [`editorial+${token}@${domain}`, `editorial+${'b'.repeat(36)}@${domain}`] },
  ]) assert.throws(() => verifyReceivedEditorialReply({ ...received, ...overrides }, owner, domain));
});

test('legacy/missing authentication and forged Authentication-Results headers never authorize approval', () => {
  for (const authentication of [null, undefined, { spf: 'pass', dkim: 'fail', dmarc: 'pass' }, { spf: 'pass', dkim: 'pass', dmarc: 'fail' }, { spf: 'pass', dkim: 'pass', dmarc: 'processing_failed' }]) {
    const received = fixture({ authentication: authentication as ReceivedEditorialEmail['authentication'], headers: { 'authentication-results': 'dkim=pass; dmarc=pass' } });
    assert.throws(() => verifyReceivedEditorialApproval(received, owner, domain), /AUTHENTICATION_REQUIRED/);
  }
});

test('aligned DKIM survives monitoring-only DMARC and forwarding SPF failure', () => {
  const result = verifyReceivedEditorialApproval(fixture({ authentication: { spf: 'fail', dkim: 'pass', dmarc: 'gray' } }), owner, domain);
  assert.equal(result.authentication.spf, 'fail');
  assert.equal(result.authentication.dmarc, 'gray');
});

test('ambiguous, injected and other-owner From addresses are rejected', () => {
  for (const from of ['owner@example.test, other@example.test', 'Owner <owner@example.test>, Other <other@example.test>',
    'Owner <owner@example.test>\r\nFrom: attacker@example.test', 'owner@example.test (other)', 'other@example.test']) {
    assert.throws(() => verifyReceivedEditorialApproval(fixture({ from }), owner, domain), /ADDRESS|OWNER_MISMATCH/);
  }
});

test('proof token must occur once in provider To; received_for is never sufficient', () => {
  for (const to of [[], ['unrelated@example.test'], [`editorial+${token}@${domain}`, `editorial+${'b'.repeat(36)}@${domain}`],
    [`editorial+${token}@${domain}`, `editorial+${token}@${domain}`], [`editorial+${token}@${domain}.evil.test`]]) {
    assert.throws(() => verifyReceivedEditorialApproval(fixture({ to, received_for: [`editorial+${token}@${domain}`] }), owner, domain), /RECIPIENT_AMBIGUOUS/);
  }
});

test('approval with requested edits, empty text or malformed timestamp is not executable', () => {
  for (const text of [null, '', 'APPROVED, but change the headline', 'APPROVED\nPlease change the price.']) {
    assert.throws(() => verifyReceivedEditorialApproval(fixture({ text }), owner, domain), /UNQUALIFIED/);
  }
  assert.throws(() => verifyReceivedEditorialApproval(fixture({ created_at: 'not-a-date' }), owner, domain), /TIMESTAMP/);
});

test('user attachments require review; only bounded inline signature bitmaps are allowed', () => {
  const inline = { content_disposition: 'inline', content_type: 'image/png', content_id: 'signature-logo', size: 1000 };
  assert.equal(verifyReceivedEditorialApproval(fixture({ attachments: [inline] }), owner, domain).sender, owner);
  for (const attachment of [{ ...inline, content_disposition: 'attachment' }, { ...inline, content_type: 'application/pdf' },
    { ...inline, content_type: 'image/svg+xml' }, { ...inline, size: 500_001 }, { ...inline, content_id: null }]) {
    assert.throws(() => verifyReceivedEditorialApproval(fixture({ attachments: [attachment] }), owner, domain), /ATTACHMENTS_REQUIRE_REVIEW/);
  }
});
