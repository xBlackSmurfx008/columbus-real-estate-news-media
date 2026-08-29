import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_STORAGE_KEY,
  isActivationEventName,
  sanitizeAnalyticsPayload,
  summarizeActivationEvents,
  type StoredActivationEvent,
} from "../lib/activation-analytics.ts";

const events: StoredActivationEvent[] = [
  {
    name: "area_follow_start",
    path: "/areas/dublin",
    timestamp: "2026-08-28T12:00:00.000Z",
    payload: { area_name: "Dublin", method: "dublin-area-hub", cadence: "weekly" },
  },
  {
    name: "preference_saved",
    path: "/areas/dublin",
    timestamp: "2026-08-28T12:01:00.000Z",
    payload: { area_slug: "dublin", area_name: "Dublin", topic: "Area Alerts", method: "dublin-area-hub", role: "buyer", interests: "Area Alerts, Market Pulse" },
  },
  {
    name: "renter_checklist_start",
    path: "/rent/before-you-sign",
    timestamp: "2026-08-28T12:02:00.000Z",
    payload: { checklist: "before-you-sign" },
  },
  {
    name: "renter_checklist_complete",
    path: "/rent/before-you-sign",
    timestamp: "2026-08-28T12:04:00.000Z",
    payload: { checklist: "before-you-sign", conversion: true },
  },
  {
    name: "search_no_results",
    path: "/search",
    timestamp: "2026-08-28T12:05:00.000Z",
    payload: { search_term: "lease fee surprise", inferred_intent: "rent" },
  },
  {
    name: "generate_lead",
    path: "/sell/your-home",
    timestamp: "2026-08-28T12:06:00.000Z",
    payload: { method: "sell-your-home", persona: "fsbo_seller", conversion: true },
  },
  {
    name: "contact_request",
    path: "/contact",
    timestamp: "2026-08-28T12:07:00.000Z",
    payload: { method: "contact-page", inquiry_type: "general", conversion: true },
  },
  {
    name: "scroll",
    path: "/",
    timestamp: "2026-08-28T12:08:00.000Z",
    payload: { percent_scrolled: 50 },
  },
];

test("activation event names are explicitly whitelisted", () => {
  assert.equal(ANALYTICS_STORAGE_KEY, "cren_analytics_events");
  assert.equal(isActivationEventName("area_follow_start"), true);
  assert.equal(isActivationEventName("search_no_results"), true);
  assert.equal(isActivationEventName("generate_lead"), true);
  assert.equal(isActivationEventName("contact_request"), true);
  assert.equal(isActivationEventName("scroll"), false);
});

test("analytics payload sanitizer keeps only safe primitive keys", () => {
  assert.deepEqual(
    sanitizeAnalyticsPayload({
      area_name: " Dublin  ",
      email: "reader@example.com",
      nested: { bad: true },
      conversion: true,
      persona: "fsbo_seller",
      inquiry_type: "advertising",
      percent_scrolled: 75,
    }),
    { area_name: "Dublin", conversion: true, persona: "fsbo_seller", inquiry_type: "advertising", percent_scrolled: 75 },
  );
});

test("activation summary counts conversion events and ignores non-activation events", () => {
  const summary = summarizeActivationEvents(events, [{ path: "/areas/dublin", views: 20, visitors: 12 }]);

  assert.equal(summary.totalEvents, 7);
  assert.equal(summary.areaFollows, 1);
  assert.equal(summary.preferencesSaved, 1);
  assert.equal(summary.zeroResultSearches, 1);
  assert.equal(summary.formSubmissions, 2);
  assert.equal(summary.checklistStarts, 1);
  assert.equal(summary.checklistCompletions, 1);
  assert.equal(summary.checklistCompletionRate, 100);
  assert.deepEqual(summary.topAreas[0], { label: "Dublin", count: 2 });
  assert.deepEqual(summary.topFormSources[0], { label: "contact-page", count: 1 });
  assert.deepEqual(summary.topFormPersonas[0], { label: "fsbo_seller", count: 1 });
  assert.deepEqual(summary.topSearchTerms[0], { label: "lease fee surprise", count: 1 });
  assert.deepEqual(summary.areaHubPerformance[0], {
    area_slug: "dublin",
    area_name: "Dublin",
    views: 20,
    visitors: 12,
    follows: 1,
    preferences: 1,
    formSubmissions: 0,
    followRate: 5,
    preferenceRate: 5,
  });
  assert.equal(summary.recentEvents[0].name, "contact_request");
});
