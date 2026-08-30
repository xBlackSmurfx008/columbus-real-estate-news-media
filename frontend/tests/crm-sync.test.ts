import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCrenCrmPayload,
  crmEventTypeForLeadPersona,
  normalizeCrmInterestTags,
  recommendCrmRoute,
  syncTo008Crm,
} from "../lib/crm-sync.ts";

function withEnv(env: Record<string, string | undefined>, run: () => Promise<void> | void) {
  const oldValues = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(oldValues)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("normalizes newsletter interest tags into CRM tags", () => {
  assert.deepEqual(
    normalizeCrmInterestTags(["Market Pulse", "Development Watch", "Before You Sign"], "renter"),
    ["market-trends", "development-policy", "apartments-rentals"],
  );
});

test("routes advertising interest to sales review", () => {
  const route = recommendCrmRoute({
    source: "advertise-page",
    inquiryType: "advertising",
    packageInterest: "Authority Spotlight",
  });

  assert.equal(route.routeKey, "advertising-sales");
  assert.equal(route.routingStatus, "sales_review");
  assert.equal(route.subscriberSegment, "vendor");
  assert(route.interestTags.includes("advertising"));
  assert(!route.interestTags.includes("advertise-page"));
});

test("routes newsletter preferences without turning source into a tag", () => {
  const route = recommendCrmRoute({
    source: "newsletter crm-test-live | role=investor",
    role: "investor",
    topic: "Market Pulse",
    interests: ["Development Watch"],
  });

  assert.equal(route.routeKey, "newsletter-growth");
  assert.equal(route.subscriberSegment, "investor");
  assert.deepEqual(route.interestTags, ["development-policy", "market-trends", "investing", "newsletter"]);
});

test("routes member profile updates as non-sales profile maintenance", () => {
  const route = recommendCrmRoute({
    source: "member-profile",
    role: "renter",
    interests: "Market Pulse",
  });

  assert.equal(route.routeKey, "member-profile");
  assert.equal(route.routingStatus, "new");
  assert(route.interestTags.includes("member"));
});

test("maps profile and rental lead personas to CRM event types", () => {
  assert.equal(crmEventTypeForLeadPersona("profile_claim"), "profile_claim");
  assert.equal(crmEventTypeForLeadPersona("directory_listing"), "profile_claim");
  assert.equal(crmEventTypeForLeadPersona("rental_listing"), "listing_inquiry");
  assert.equal(crmEventTypeForLeadPersona("fsbo_seller"), "lead");
});

test("builds a cleaned CRM payload", () => {
  const payload = buildCrenCrmPayload({
    eventType: "newsletter_subscriber",
    externalId: "cren:subscribers:123",
    contact: {
      name: "  Jane Reader  ",
      email: " jane@example.com ",
      role: " renter ",
    },
    lead: {
      source: " subscribe-page ",
      interestTags: ["Market Pulse", "Market Pulse", "Development Watch"],
    },
  });

  assert.equal(payload.sourceSystem, "columbus-real-estate-news");
  assert.equal(payload.contact.email, "jane@example.com");
  assert.deepEqual(payload.lead?.interestTags, ["market-trends", "development-policy"]);
});

test("skips sync when the shared secret is missing", async () => {
  await withEnv(
    {
      CRM_SYNC_SECRET: undefined,
      CREN_CRM_SYNC_SECRET: undefined,
      CRM_SYNC_URL: undefined,
      CREN_CRM_SYNC_URL: undefined,
      CRM_SYNC_ENABLED: undefined,
      CREN_CRM_SYNC_ENABLED: undefined,
    },
    async () => {
      const result = await syncTo008Crm({
        eventType: "contact",
        externalId: "cren:contacts:1",
        contact: { email: "reader@example.com" },
      });

      assert.deepEqual(result, { ok: true, skipped: true, reason: "missing_secret" });
    },
  );
});

test("refuses to send CRM data to an unexpected host", async () => {
  await withEnv(
    {
      CRM_SYNC_SECRET: "test-secret",
      CRM_SYNC_URL: "https://example.com/api/v1/inbound/cre-news",
      CRM_SYNC_ENABLED: undefined,
      CREN_CRM_SYNC_ENABLED: undefined,
    },
    async () => {
      const result = await syncTo008Crm({
        eventType: "contact",
        externalId: "cren:contacts:2",
        contact: { email: "reader@example.com" },
      });

      assert.deepEqual(result, { ok: true, skipped: true, reason: "missing_url" });
    },
  );
});

test("sends signed payloads to the CRM intake endpoint", async () => {
  await withEnv(
    {
      CRM_SYNC_SECRET: "test-secret",
      CRM_SYNC_URL: undefined,
      CRM_SYNC_ENABLED: undefined,
      CREN_CRM_SYNC_ENABLED: undefined,
    },
    async () => {
      const result = await syncTo008Crm(
        {
          eventType: "member_profile",
          externalId: "cren:members:1",
          contact: { email: "member@example.com", name: "Member One" },
        },
        async (url, init) => {
          assert.equal(String(url), "https://crm.mradams.xyz/api/v1/inbound/cre-news");
          assert.equal(init?.method, "POST");
          const headers = new Headers(init?.headers);
          assert.equal(headers.get("authorization"), "Bearer test-secret");
          assert.equal(headers.get("idempotency-key"), "cren:members:1");
          const body = JSON.parse(String(init?.body));
          assert.equal(body.eventType, "member_profile");
          assert.equal(body.contact.email, "member@example.com");
          return new Response(JSON.stringify({ ok: true }), { status: 201 });
        },
      );

      assert.deepEqual(result, { ok: true, status: 201 });
    },
  );
});
