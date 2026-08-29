import assert from "node:assert/strict";
import test from "node:test";
import {
  assertExecutionAllowed,
  buildSmokeRequests,
  isLocalBaseUrl,
  parseSmokeArgs,
  redactSensitiveText,
  runSubmissionSmoke,
} from "../scripts/submission-smoke.mjs";

test("submission smoke builds controlled requests for all public paths", () => {
  const requests = buildSmokeRequests({ runId: "test-run-123" });
  assert.deepEqual(requests.map((request) => request.route), ["contact", "subscribe", "leads", "members"]);
  assert.deepEqual(requests.map((request) => request.endpoint), ["/api/contact", "/api/subscribe", "/api/leads", "/api/members"]);
  assert.ok(requests.every((request) => request.expectedStatus === 201));

  const emails = new Set(requests.map((request) => request.email));
  assert.equal(emails.size, 4);
  for (const request of requests) {
    assert.match(request.email, /^codex\.smoke\+test-run-123-[a-z]+@example\.com$/);
    assert.equal(request.payload.email, request.email);
    assert.equal(request.source, `codex-smoke:test-run-123:${request.route}`);
  }

  const lead = requests.find((request) => request.route === "leads");
  assert.equal(lead.payload.consent, true);
  assert.equal(lead.payload.company, undefined);
});

test("submission smoke defaults to a local dry-run", () => {
  const options = parseSmokeArgs([], {});
  assert.equal(options.baseUrl, "http://localhost:3000");
  assert.equal(options.execute, false);
  assert.equal(options.allowRemote, false);
  assert.equal(options.verifyDb, false);
  assert.equal(options.invalidPayload, false);
  assert.deepEqual(options.routes, ["contact", "subscribe", "leads", "members"]);
});

test("submission smoke can build validation-only invalid payloads", () => {
  const requests = buildSmokeRequests({ runId: "bad-payload-run", invalidPayload: true });
  assert.deepEqual(requests.map((request) => request.expectedStatus), [400, 400, 400, 400]);

  for (const request of requests) {
    assert.equal(request.payload.email, `codex-smoke-invalid-${request.route}`);
    assert.equal(request.source, `codex-smoke:bad-payload-run:${request.route}`);
  }
});

test("submission smoke route filter preserves only requested routes", () => {
  const options = parseSmokeArgs(["--route", "subscribe,members", "--run-id", "custom-run"], {});
  const requests = buildSmokeRequests({ runId: options.runId, routes: options.routes });
  assert.deepEqual(requests.map((request) => request.route), ["subscribe", "members"]);
});

test("submission smoke refuses remote execution unless explicitly allowed", () => {
  assert.throws(
    () => parseSmokeArgs(["--execute", "--base-url", "https://columbusrealestatenews.com"], {}),
    /--allow-remote/,
  );

  const options = parseSmokeArgs(
    ["--execute", "--allow-remote", "--base-url", "https://columbusrealestatenews.com"],
    {},
  );
  assert.equal(options.execute, true);
  assert.equal(options.allowRemote, true);
  assert.doesNotThrow(() => assertExecutionAllowed(options));
});

test("submission smoke refuses credential-bearing base URLs", () => {
  assert.throws(
    () => parseSmokeArgs(["--base-url", "https://user:secret@example.com"], {}),
    /must not include credentials/,
  );
});

test("submission smoke executes invalid payload mode without DB insertion verification", async () => {
  const seen = [];
  const options = parseSmokeArgs(["--execute", "--invalid-payload", "--verify-db", "--run-id", "bad-payload-run"], {});
  const summary = await runSubmissionSmoke(options, {
    databaseUrl: ["postgres", "://", "user:secret", "@", "example.invalid/db"].join(""),
    fetchImpl: async (url, init) => {
      seen.push({ url: String(url), body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ error: "Enter a valid email address." }), { status: 400 });
    },
  });

  assert.equal(summary.dryRun, false);
  assert.equal(summary.httpResults.length, 4);
  assert.ok(summary.httpResults.every((result) => result.ok));
  assert.deepEqual(summary.dbVerification, { skipped: true, reason: "INVALID_PAYLOAD_MODE", results: [] });
  assert.equal(seen.length, 4);
  assert.ok(seen.every((request) => String(request.body.email).startsWith("codex-smoke-invalid-")));
});

test("submission smoke recognizes local base URLs", () => {
  assert.equal(isLocalBaseUrl("http://localhost:3000"), true);
  assert.equal(isLocalBaseUrl("http://127.0.0.1:3000"), true);
  assert.equal(isLocalBaseUrl("https://columbusrealestatenews.com"), false);
});

test("submission smoke redacts token-like and database URL text", () => {
  const fakeToken = ["1234567890", "ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghi"].join(":");
  const fakeDatabaseUrl = ["postgres", "://", "user:pass", "@", "example/db"].join("");
  const redacted = redactSensitiveText(
    `bad ${fakeToken} ${fakeDatabaseUrl}`,
  );
  assert.doesNotMatch(redacted, /1234567890:/);
  assert.doesNotMatch(redacted, /user:pass@example/);
  assert.match(redacted, /\[redacted-telegram-token\]/);
  assert.match(redacted, /postgres:\/\/\[redacted-database-url\]/);
});
