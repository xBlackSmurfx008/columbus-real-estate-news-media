import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { Webhook } from 'svix';
import ts from 'typescript';
import { verifyReceivedEditorialReply, verifyReceivedEditorialApproval } from '../lib/editorial-received-email.ts';
import { classifyEditorialReply } from '../lib/editorial-email-review.ts';

const require = createRequire(import.meta.url);
const secret = `whsec_${Buffer.from('isolated-webhook-auth-fixture-only').toString('base64')}`;
const owner = 'owner@example.test';
const domain = 'review.example.test';
const token = 'a'.repeat(36);
const emailId = 'd137ef4a-b608-41c4-a699-6bebb92621e4';
const fixture = overrides => ({
  id: emailId, from: `Owner <${owner}>`, to: [`editorial+${token}@${domain}`],
  text: 'Please correct the completion date.', created_at: '2026-09-22T10:00:00Z',
  authentication: { spf: 'pass', dkim: 'pass', dmarc: 'pass' }, attachments: [], ...overrides,
});
const source = readFileSync(new URL('../app/api/webhooks/resend/editorial-review/route.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } });

function harness(received, { fetchError, env = {} } = {}) {
  const calls = { fetch: 0, db: 0, recorded: [], published: 0, warnings: [] };
  const stubs = {
    'next/server': { NextResponse: Response },
    'svix': { Webhook },
    '@/lib/db': { getDb: () => { calls.db++; return {}; } },
    '@/lib/editorial-email-review': { classifyEditorialReply },
    '@/lib/editorial-received-email': {
      verifyReceivedEditorialReply,
      fetchReceivedEditorialEmail: async () => { calls.fetch++; if (fetchError) throw fetchError; return received; },
    },
    '@/lib/editorial-email-events': { recordEditorialReply: async (_sql, input) => {
      calls.recorded.push(input); return { accepted: true, decision: classifyEditorialReply(input.text).decision };
    } },
    '@/lib/editorial-email-publication': { processEditorialEmailPublication: async (_sql, id, options) => {
      assert.equal(id, emailId);
      verifyReceivedEditorialApproval(options.providerReceipt, owner, domain);
      calls.published++; return { published: true };
    } },
    'next/cache': { revalidatePath: () => {} },
  };
  const exports = {};
  runInNewContext(outputText, { exports, Error, process: { env: {
    RESEND_EDITORIAL_WEBHOOK_SECRET: secret, RESEND_RECEIVING_API_KEY: 'fixture-only',
    CREN_EDITOR_REVIEW_EMAIL: owner, CREN_EDITOR_REVIEW_DOMAIN: domain, ...env,
  } }, console: { warn: (...args) => calls.warnings.push(args) }, require: id => stubs[id] ?? require(id) });
  return { calls, post: exports.POST };
}
function request({ invalidSignature = false, data = {} } = {}) {
  const body = JSON.stringify({ type: 'email.received', data: { email_id: emailId, to: [`editorial+${'b'.repeat(36)}@${domain}`], ...data } });
  const now = new Date(), id = 'msg_fixture_auth';
  return new Request('https://example.test/api/webhooks/resend/editorial-review', {
    method: 'POST', body, headers: { 'content-type': 'application/json', 'svix-id': id,
      'svix-timestamp': String(Math.floor(now.getTime() / 1000)),
      'svix-signature': invalidSignature ? 'invalid' : new Webhook(secret).sign(id, now, body),
    },
  });
}

test('signed webhook plus forged/unauthenticated corrections never touches the database or publication', async () => {
  for (const overrides of [
    { authentication: null },
    { authentication: { spf: 'pass', dkim: 'fail', dmarc: 'pass' } },
    { authentication: { spf: 'pass', dkim: 'pass', dmarc: 'fail' } },
    { from: 'attacker@example.test' },
    { from: `Owner <${owner}>, Attacker <attacker@example.test>` },
    { to: [], received_for: [`editorial+${token}@${domain}`] },
    { to: [`editorial+${token}@${domain}`, `editorial+${'b'.repeat(36)}@${domain}`] },
  ]) {
    const { calls, post } = harness(fixture({ ...overrides, headers: { 'authentication-results': 'dkim=pass; dmarc=pass' } }));
    const response = await post(request());
    assert.equal(response.status, 200, 'permanent rejection is acknowledged, not retried');
    assert.deepEqual(await response.json(), { ok: true, ignored: true, reason: 'UNVERIFIED_EDITORIAL_REPLY' });
    assert.equal(calls.db, 0); assert.equal(calls.recorded.length, 0); assert.equal(calls.published, 0);
    assert.equal(calls.warnings.length, 1);
    assert.ok(!JSON.stringify(calls.warnings).includes(owner));
  }
});

test('authenticated correction uses provider To token and canonical sender, never webhook received_for', async () => {
  const { calls, post } = harness(fixture({ authentication: { spf: 'fail', dkim: 'pass', dmarc: 'gray' } }));
  const response = await post(request({ data: { to: [], received_for: [`editorial+${'c'.repeat(36)}@${domain}`] } }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).decision, 'CHANGES_REQUESTED');
  assert.equal(calls.recorded.length, 1); assert.equal(calls.published, 0);
  assert.equal(calls.recorded[0].token, token); assert.equal(calls.recorded[0].from, owner);
  assert.equal(calls.recorded[0].text, fixture().text);
});

test('authenticated standalone approval still reaches existing guarded publication', async () => {
  const { calls, post } = harness(fixture({ text: 'APPROVED' }));
  const response = await post(request());
  assert.equal(response.status, 200); assert.equal((await response.json()).published, true);
  assert.equal(calls.recorded.length, 1); assert.equal(calls.published, 1);
});

test('signature failure and missing owner never retrieve or record a message', async () => {
  for (const scenario of [{ invalidSignature: true, env: {}, status: 400 }, { env: { CREN_EDITOR_REVIEW_EMAIL: '' }, status: 503 }]) {
    const { calls, post } = harness(fixture(), { env: scenario.env });
    const response = await post(request(scenario));
    assert.equal(response.status, scenario.status); assert.equal(calls.fetch, 0); assert.equal(calls.db, 0);
  }
});

test('transient provider retrieval and invalid domain configuration remain retryable without writes', async () => {
  for (const options of [{ fetchError: new Error('RECEIVING_FETCH_FAILED') }, { env: { CREN_EDITOR_REVIEW_DOMAIN: 'invalid' } }]) {
    const { calls, post } = harness(fixture(), options);
    const response = await post(request());
    assert.equal(response.status, 503); assert.equal(calls.db, 0); assert.equal(calls.recorded.length, 0);
  }
});
