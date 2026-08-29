#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ACTIVATION_EVENT_DEFINITIONS } from "../lib/activation-analytics.ts";

const DEFAULT_SPRINT_PATH = "content/editorial-sprints/new-page-content-sprint-2026-08-28.json";
const filePath = resolve(process.cwd(), process.argv[2] ?? DEFAULT_SPRINT_PATH);
const sprint = JSON.parse(readFileSync(filePath, "utf8"));
const validAnalyticsEvents = new Set(ACTIVATION_EVENT_DEFINITIONS.map((event) => event.name));
const placeholderPattern = /\b(?:TODO|TBD|FIXME)\b/i;

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isRoute(value) {
  return typeof value === "string" && value.startsWith("/") && !value.includes(" ");
}

function hasText(value, min = 1) {
  return typeof value === "string" && value.trim().length >= min && !placeholderPattern.test(value);
}

function hasTextArray(value, minItems = 1, minText = 8) {
  return Array.isArray(value) && value.length >= minItems && value.every((item) => hasText(item, minText));
}

function fail(message) {
  return message;
}

const failures = [];

if (!hasText(sprint.id)) failures.push(fail("Sprint id is missing."));
if (!hasText(sprint.status)) failures.push(fail("Sprint status is missing."));
if (!Array.isArray(sprint.assignments) || sprint.assignments.length === 0) {
  failures.push(fail("Sprint has no assignments."));
}

const ids = new Set();
const priorities = new Set();

for (const assignment of sprint.assignments ?? []) {
  const label = assignment?.id ?? "unknown-assignment";

  if (!hasText(assignment.id)) failures.push(fail(`${label}: id is missing.`));
  if (ids.has(assignment.id)) failures.push(fail(`${label}: duplicate assignment id.`));
  ids.add(assignment.id);

  if (!Number.isInteger(assignment.priority) || assignment.priority < 1) {
    failures.push(fail(`${label}: priority must be a positive integer.`));
  }
  if (priorities.has(assignment.priority)) failures.push(fail(`${label}: duplicate priority ${assignment.priority}.`));
  priorities.add(assignment.priority);

  for (const field of ["title", "format", "reader_job", "angle"]) {
    if (!hasText(assignment[field], 12)) failures.push(fail(`${label}: ${field} is incomplete.`));
  }

  if (!Array.isArray(assignment.target_routes) || assignment.target_routes.length === 0 || !assignment.target_routes.every(isRoute)) {
    failures.push(fail(`${label}: target_routes must contain route paths.`));
  }

  if (!Array.isArray(assignment.search_intents) || assignment.search_intents.length < 3 || !assignment.search_intents.every((item) => hasText(item, 8))) {
    failures.push(fail(`${label}: at least three search intents are required.`));
  }

  if (!Array.isArray(assignment.source_records) || assignment.source_records.length < 3) {
    failures.push(fail(`${label}: at least three source records are required.`));
  } else {
    const sourceIds = new Set();
    let primaryCount = 0;
    for (const source of assignment.source_records) {
      if (!hasText(source.id)) failures.push(fail(`${label}: source id is missing.`));
      if (sourceIds.has(source.id)) failures.push(fail(`${label}: duplicate source id ${source.id}.`));
      sourceIds.add(source.id);
      if (!["PRIMARY", "SECONDARY"].includes(source.type)) failures.push(fail(`${label}: source ${source.id} has invalid type.`));
      if (source.type === "PRIMARY") primaryCount++;
      if (!hasText(source.publisher)) failures.push(fail(`${label}: source ${source.id} publisher is missing.`));
      if (!hasText(source.title)) failures.push(fail(`${label}: source ${source.id} title is missing.`));
      if (!isHttpsUrl(source.url)) failures.push(fail(`${label}: source ${source.id} must use https URL.`));
      if (!hasText(source.use_for, 12)) failures.push(fail(`${label}: source ${source.id} use_for is incomplete.`));
    }
    if (primaryCount < 1) failures.push(fail(`${label}: at least one primary source is required.`));
  }

  if (!Array.isArray(assignment.original_reporting_tasks) || assignment.original_reporting_tasks.length < 3) {
    failures.push(fail(`${label}: at least three original reporting tasks are required.`));
  }

  if (!hasTextArray(assignment.claim_source_notes, 3, 12)) {
    failures.push(fail(`${label}: at least three claim/source notes are required.`));
  }

  if (!hasTextArray(assignment.data_refresh_notes, 1, 12)) {
    failures.push(fail(`${label}: data refresh notes are required.`));
  }

  if (!assignment.primary_cta || !hasText(assignment.primary_cta.label, 6) || !isRoute(assignment.primary_cta.href)) {
    failures.push(fail(`${label}: primary CTA must have label and local href.`));
  }

  if (!Array.isArray(assignment.analytics_events) || assignment.analytics_events.length === 0) {
    failures.push(fail(`${label}: analytics_events are required.`));
  } else {
    for (const eventName of assignment.analytics_events) {
      if (!validAnalyticsEvents.has(eventName)) failures.push(fail(`${label}: unknown analytics event ${eventName}.`));
    }
  }

  if (!validAnalyticsEvents.has(assignment.primary_analytics_event)) {
    failures.push(fail(`${label}: primary_analytics_event must be a valid activation event.`));
  }

  if (!Array.isArray(assignment.publish_blocks) || assignment.publish_blocks.length < 3 || !assignment.publish_blocks.every((item) => hasText(item, 12))) {
    failures.push(fail(`${label}: at least three publish blocks are required.`));
  }

  if (
    !assignment.image_source_guidance ||
    !hasText(assignment.image_source_guidance.source_label, 12) ||
    !hasText(assignment.image_source_guidance.primary_request, 12) ||
    !hasText(assignment.image_source_guidance.caption_guidance, 12) ||
    !hasTextArray(assignment.image_source_guidance.avoid, 2, 8)
  ) {
    failures.push(fail(`${label}: image/source-label guidance is incomplete.`));
  }

  if (
    !assignment.publish_gate ||
    !hasText(assignment.publish_gate.status, 12) ||
    assignment.publish_gate.status !== "HELD_FOR_SOURCE_REFRESH_AND_EDITORIAL_REVIEW" ||
    !hasTextArray(assignment.publish_gate.required_before_publish, 3, 12)
  ) {
    failures.push(fail(`${label}: publish gate status and requirements are incomplete.`));
  }

  if (!assignment.freshness || !hasText(assignment.freshness.owner) || !hasText(assignment.freshness.cadence) || !hasText(assignment.freshness.refresh_trigger, 12)) {
    failures.push(fail(`${label}: freshness owner, cadence, and refresh trigger are required.`));
  }
}

if (failures.length > 0) {
  console.error(`Content sprint validation failed for ${filePath}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  file: filePath,
  assignments: sprint.assignments.length,
  sourceRecords: sprint.assignments.reduce((sum, assignment) => sum + assignment.source_records.length, 0),
  targetRoutes: [...new Set(sprint.assignments.flatMap((assignment) => assignment.target_routes))].length,
}, null, 2));
