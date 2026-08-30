import assert from "node:assert/strict";
import { after, test } from "node:test";

const original = {
  enabled: process.env.CRM_SYNC_ENABLED,
  url: process.env.CRM_SYNC_URL,
  secret: process.env.CRM_SYNC_SECRET,
  attempts: process.env.CRM_SYNC_MAX_ATTEMPTS,
  delay: process.env.CRM_SYNC_RETRY_DELAY_MS,
};

const input = {
  eventType: "lead",
  externalId: "crm-sync-uat-001",
  contact: { name: "UAT Contact", email: "uat@example.com" },
  lead: { title: "UAT lead", interestTags: ["Advertising", "advertise"] },
};

const crm = import("../lib/crm-sync.ts");

test("CRM sync retries transient failures with the same idempotency key", async () => {
  process.env.CRM_SYNC_ENABLED = "true";
  process.env.CRM_SYNC_URL = "https://crm.mradams.xyz/api/v1/inbound/cre-news";
  process.env.CRM_SYNC_SECRET = "test-secret";
  process.env.CRM_SYNC_MAX_ATTEMPTS = "3";
  process.env.CRM_SYNC_RETRY_DELAY_MS = "0";
  const { syncTo008Crm } = await crm;
  let calls = 0;
  const keys = [];
  const result = await syncTo008Crm(input, async (_url, init) => {
    calls += 1;
    keys.push(init.headers["Idempotency-Key"]);
    return new Response(null, { status: calls < 3 ? 503 : 200 });
  });
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 3);
  assert.equal(calls, 3);
  assert.deepEqual(keys, [input.externalId, input.externalId, input.externalId]);
});

test("CRM sync does not retry permanent client failures", async () => {
  process.env.CRM_SYNC_ENABLED = "true";
  process.env.CRM_SYNC_URL = "https://crm.mradams.xyz/api/v1/inbound/cre-news";
  process.env.CRM_SYNC_SECRET = "test-secret";
  process.env.CRM_SYNC_MAX_ATTEMPTS = "3";
  process.env.CRM_SYNC_RETRY_DELAY_MS = "0";
  const { syncTo008Crm } = await crm;
  let calls = 0;
  const result = await syncTo008Crm({ ...input, externalId: "crm-sync-uat-002" }, async () => {
    calls += 1;
    return new Response(null, { status: 422 });
  });
  assert.equal(result.ok, false);
  assert.equal(result.attempts, 1);
  assert.equal(calls, 1);
});

test("CRM sync can be explicitly disabled without calling the provider", async () => {
  process.env.CRM_SYNC_ENABLED = "false";
  const { syncTo008Crm } = await crm;
  let calls = 0;
  const result = await syncTo008Crm(input, async () => {
    calls += 1;
    return new Response(null, { status: 200 });
  });
  assert.deepEqual(result, { ok: true, skipped: true, reason: "disabled" });
  assert.equal(calls, 0);
});

after(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
