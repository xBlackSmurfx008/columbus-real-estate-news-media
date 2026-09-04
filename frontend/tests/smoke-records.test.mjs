import assert from "node:assert/strict";
import test from "node:test";
import {
  nonSmokeWhere,
  smokeCountQuery,
  smokeDeleteQuery,
  smokeFlagQuery,
  smokeTableDefinition,
  smokeWhere,
} from "../scripts/smoke-records-lib.mjs";
import {
  isTestEmail,
  isTestSource,
  isTestTraffic,
  realTrafficSql,
  testTrafficSql,
} from "../scripts/test-traffic-lib.mjs";

test("smoke record filters cover every public audience and consent table", () => {
  for (const table of ["contacts", "subscribers", "leads", "members", "consent_events"]) {
    assert.match(smokeWhere(table), /~\*/);
    assert.match(nonSmokeWhere(table), /^NOT /);
    assert.match(smokeCountQuery(table), new RegExp(`FROM ${table}`));
    assert.match(smokeDeleteQuery(table), new RegExp(`DELETE FROM ${table}`));
    assert.match(smokeFlagQuery(table), new RegExp(`UPDATE ${table}`));
  }
});

test("smoke record table names are whitelisted", () => {
  assert.equal(smokeTableDefinition("leads").marker, "source");
  assert.equal(smokeTableDefinition("members").marker, "interests");
  assert.equal(smokeTableDefinition("consent_events").marker, "source_route");
  assert.throws(() => smokeTableDefinition("articles"), /Unsupported smoke table/);
});

test("the production records the 2026-09-04 audit found are classified as test traffic", () => {
  // Exact values pulled from production during the audit.
  const smokeSources = [
    "crm-test-live | role=investor | cadence=weekly",
    "crm-integration-verification",
    "join-crm-test",
    "crm-live-smoke-duplicate | role=buyer",
    "advertise-crm-test",
    "advertise-crm-live-smoke",
    "rent-find-a-home-crm-test",
    "codex-smoke:subscribe",
  ];
  for (const source of smokeSources) {
    assert.equal(isTestSource(source), true, `expected test source: ${source}`);
  }

  assert.equal(isTestEmail("crm.integration.test.20260830@example.com"), true);
  assert.equal(isTestEmail("codex.smoke+1@example.com"), true);

  // The owner's own contact row said "E2E test - Contact form submission".
  assert.equal(
    isTestTraffic({ source: "direct", email: "mradams@digiwealth.io", body: "E2E test - Contact form submission from live site." }),
    true,
  );
});

test("real audience records are NOT classified as test traffic", () => {
  // The only real subscriber all-time.
  assert.equal(isTestTraffic({ source: "direct", email: "mradams@digiwealth.io" }), false);
  for (const source of ["find-a-home", "blog-cta", "member-profile", "lead-success", "advertise", "join", "latest-brief"]) {
    assert.equal(isTestSource(source), false, `false positive on real source: ${source}`);
  }
  assert.equal(isTestEmail("someone@columbus.example-realty.com"), false);
  assert.equal(isTestEmail("reader@gmail.com"), false);
});

test("the explicit is_test flag alone is enough", () => {
  assert.equal(isTestTraffic({ source: "find-a-home", email: "reader@gmail.com", flagged: true }), true);
});

test("SQL predicates degrade safely when the migration has not run", () => {
  // No is_test column yet: still filters on source and email.
  const partial = testTrafficSql("subscribers", ["id", "source", "email"]);
  assert.ok(!partial.includes("is_test"));
  assert.match(partial, /source/);

  // affiliate_clicks has no source or email at all.
  assert.equal(testTrafficSql("affiliate_clicks", ["id", "partner_slug"]), "false");
  assert.equal(realTrafficSql("affiliate_clicks", ["id", "partner_slug"]), "true");
});
