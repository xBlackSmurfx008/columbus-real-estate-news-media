import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ACTIVATION_EVENT_DEFINITIONS } from "../lib/activation-analytics.ts";

const sprint = JSON.parse(
  await readFile(new URL("../content/editorial-sprints/new-page-content-sprint-2026-08-28.json", import.meta.url), "utf8"),
);
const validAnalyticsEvents = new Set(ACTIVATION_EVENT_DEFINITIONS.map((event) => event.name));
const placeholders = /\b(?:TODO|TBD|FIXME)\b/i;

test("new page content sprint has the required proof-cohort assignments", () => {
  assert.equal(sprint.status, "ready_for_reporting");
  assert.equal(sprint.source_refresh_required, true);
  assert.equal(sprint.assignments.length, 8);

  const ids = sprint.assignments.map((assignment) => assignment.id);
  assert.deepEqual(ids, [
    "dublin-reality-check-2026-08",
    "german-village-reality-check-2026-08",
    "franklinton-what-changed-here-2026-08",
    "osu-student-rental-due-diligence-2026-08",
    "columbus-market-pulse-starter-2026-08",
    "weekend-by-area-proof-hub-insert-2026-08",
    "buyer-substitution-guide-columbus-2026-08",
    "sponsor-safe-service-guide-2026-08",
  ]);
});

test("new page content sprint assignments are source-backed and measurable", () => {
  for (const assignment of sprint.assignments) {
    assert.ok(!placeholders.test(JSON.stringify(assignment)), `${assignment.id} has no placeholder markers`);
    assert.ok(assignment.target_routes.length >= 1, `${assignment.id} has target routes`);
    assert.ok(assignment.target_routes.every((route) => route.startsWith("/")), `${assignment.id} routes are local`);
    assert.ok(assignment.search_intents.length >= 3, `${assignment.id} has search intents`);
    assert.ok(assignment.source_records.length >= 3, `${assignment.id} has enough source records`);
    assert.ok(assignment.source_records.some((source) => source.type === "PRIMARY"), `${assignment.id} has a primary source`);
    assert.ok(assignment.source_records.every((source) => source.url.startsWith("https://")), `${assignment.id} sources use https`);
    assert.ok(assignment.original_reporting_tasks.length >= 3, `${assignment.id} has original reporting tasks`);
    assert.ok(assignment.claim_source_notes.length >= 3, `${assignment.id} has claim/source notes`);
    assert.ok(assignment.data_refresh_notes.length >= 1, `${assignment.id} has data refresh notes`);
    assert.ok(assignment.publish_blocks.length >= 3, `${assignment.id} has publish blocks`);
    assert.ok(assignment.primary_cta.href.startsWith("/"), `${assignment.id} CTA is local`);
    assert.ok(assignment.analytics_events.every((eventName) => validAnalyticsEvents.has(eventName)), `${assignment.id} events are valid`);
    assert.ok(validAnalyticsEvents.has(assignment.primary_analytics_event), `${assignment.id} has primary event`);
    assert.equal(assignment.publish_gate.status, "HELD_FOR_SOURCE_REFRESH_AND_EDITORIAL_REVIEW");
    assert.ok(assignment.publish_gate.required_before_publish.length >= 3, `${assignment.id} has gate requirements`);
    assert.ok(assignment.image_source_guidance.source_label, `${assignment.id} has image source label`);
    assert.ok(assignment.image_source_guidance.caption_guidance, `${assignment.id} has caption guidance`);
    assert.ok(assignment.freshness.owner);
    assert.ok(assignment.freshness.cadence);
    assert.ok(assignment.freshness.refresh_trigger);
  }
});

test("new page content sprint covers the newly built public surfaces", () => {
  const routes = new Set(sprint.assignments.flatMap((assignment) => assignment.target_routes));

  for (const route of [
    "/buy/price-band-reality",
    "/areas/dublin",
    "/areas/german-village",
    "/areas/franklinton",
    "/areas/ohio-state-university-area",
    "/rent/before-you-sign",
    "/subscribe",
    "/search",
    "/directory/sponsor-rules",
  ]) {
    assert.ok(routes.has(route), `${route} is covered`);
  }
});
