import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_OWNER_KEY,
  SEED_OWNERS,
  addBusinessMinutes,
  buildSlaTimer,
  businessMinutesBetween,
  inquiryTypeForContact,
  inquiryTypeForPersona,
  isTestInquiry,
  observedHolidays,
  resolveOwnerKey,
  slaSnapshot,
  SLA_BUSINESS_MINUTES,
} from "../lib/inquiry-queue.ts";

/** 2026-09-04 is a Friday. All times below are ET wall clock. */
const FRIDAY_10AM = new Date("2026-09-04T14:00:00.000Z"); // 10:00 EDT
const FRIDAY_5PM = new Date("2026-09-04T21:00:00.000Z"); // 17:00 EDT
const SATURDAY_NOON = new Date("2026-09-05T16:00:00.000Z"); // 12:00 EDT

test("one business day inside the same week lands on the next business day", () => {
  const due = addBusinessMinutes(FRIDAY_10AM, SLA_BUSINESS_MINUTES);
  // 9 business hours from Fri 10:00 = 8h to Fri 18:00, 1h into Mon => Mon 10:00 ET.
  assert.equal(due.toISOString(), "2026-09-08T14:00:00.000Z");
});

test("the clock does not run over a weekend", () => {
  const due = addBusinessMinutes(FRIDAY_5PM, 60);
  // 1h from Fri 17:00 = Fri 18:00 exactly.
  assert.equal(due.toISOString(), "2026-09-04T22:00:00.000Z");
  const spill = addBusinessMinutes(FRIDAY_5PM, 120);
  // The extra hour resumes Monday 09:00 ET.
  assert.equal(spill.toISOString(), "2026-09-08T14:00:00.000Z");
});

test("an inquiry received outside business hours starts at the next open", () => {
  const due = addBusinessMinutes(SATURDAY_NOON, 60);
  assert.equal(due.toISOString(), "2026-09-08T14:00:00.000Z"); // Mon 10:00 ET
});

test("observed holidays are skipped", () => {
  const holidays = observedHolidays(2026);
  assert.ok(holidays.has("2026-09-07")); // Labor Day 2026
  // Thursday before Labor Day weekend, 09:00 ET + 9 business hours skips Monday.
  const due = addBusinessMinutes(new Date("2026-09-04T22:00:00.000Z"), 60); // Fri 18:00 ET
  assert.equal(due.toISOString(), "2026-09-08T14:00:00.000Z");
});

test("business minutes between is the inverse of adding them", () => {
  const due = addBusinessMinutes(FRIDAY_10AM, 300);
  assert.equal(businessMinutesBetween(FRIDAY_10AM, due), 300);
});

test("every timer warns strictly before it is due", () => {
  const timer = buildSlaTimer(FRIDAY_10AM);
  assert.ok(timer.warnAt.getTime() < timer.dueAt.getTime());
  assert.ok(timer.warnAt.getTime() > FRIDAY_10AM.getTime());
});

test("sla snapshot transitions on_track -> due_soon -> breached", () => {
  const timer = buildSlaTimer(FRIDAY_10AM);
  const row = {
    received_at: FRIDAY_10AM,
    sla_due_at: timer.dueAt,
    sla_warn_at: timer.warnAt,
    first_response_at: null,
  };
  assert.equal(slaSnapshot(row, FRIDAY_10AM).state, "on_track");
  assert.equal(slaSnapshot(row, new Date(timer.warnAt.getTime() + 60_000)).state, "due_soon");
  assert.equal(slaSnapshot(row, new Date(timer.dueAt.getTime() + 60_000)).state, "breached");
});

test("a recorded response is scored met or met_late against the deadline", () => {
  const timer = buildSlaTimer(FRIDAY_10AM);
  const onTime = slaSnapshot({
    received_at: FRIDAY_10AM,
    sla_due_at: timer.dueAt,
    sla_warn_at: timer.warnAt,
    first_response_at: new Date(FRIDAY_10AM.getTime() + 30 * 60_000),
  });
  assert.equal(onTime.state, "met");
  assert.equal(onTime.responseBusinessMinutes, 30);

  const late = slaSnapshot({
    received_at: FRIDAY_10AM,
    sla_due_at: timer.dueAt,
    sla_warn_at: timer.warnAt,
    first_response_at: new Date(timer.dueAt.getTime() + 60 * 60_000),
  });
  assert.equal(late.state, "met_late");
});

test("CRM smoke records are detected by construction", () => {
  assert.equal(isTestInquiry({ email: "crm.integration.lead@example.com" }), true);
  assert.equal(isTestInquiry({ email: "a@b.com", source: "rent-find-a-home-crm-test" }), true);
  assert.equal(isTestInquiry({ email: "a@b.com", source: "advertise-crm-live-smoke" }), true);
  assert.equal(isTestInquiry({ email: "codex.smoke+1@anywhere.com" }), true);
  assert.equal(isTestInquiry({ email: "seller@gmail.com", source: "sell-your-home" }), false);
});

test("every funnel maps to a queue type and every type resolves an owner", () => {
  assert.equal(inquiryTypeForPersona("fsbo_seller"), "seller");
  assert.equal(inquiryTypeForPersona("capital_partner"), "capital");
  assert.equal(inquiryTypeForPersona("renter"), "rental");
  assert.equal(inquiryTypeForPersona("directory_listing"), "directory");
  assert.equal(inquiryTypeForContact("advertise-page"), "advertiser");
  assert.equal(inquiryTypeForContact("contact", "advertising"), "advertiser");
  assert.equal(inquiryTypeForContact("contact"), "general");

  for (const type of ["seller", "rental", "capital", "advertiser", "directory", "general"] as const) {
    assert.equal(resolveOwnerKey(type, SEED_OWNERS), DEFAULT_OWNER_KEY);
    // An empty registry must still produce an owner: the invariant cannot depend on data.
    assert.equal(resolveOwnerKey(type, []), DEFAULT_OWNER_KEY);
  }
});
