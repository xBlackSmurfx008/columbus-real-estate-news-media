/**
 * Coverage calendar — date logic and ranking.
 *
 * Timezone is where this breaks. Columbus is America/New_York, the daily
 * routine fires at 06:33 Eastern (10:33 or 11:33 UTC), and the naive way to
 * get "today" — `new Date().toISOString().slice(0, 10)` — is correct there but
 * wrong for anyone running the command from Europe or Asia, and wrong for the
 * whole newsroom on any evening. So these tests pin real instants either side
 * of both midnights and both DST transitions.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_LEAD_DAYS,
  addDays,
  buildBriefSection,
  classifyEntry,
  computePublishBy,
  daysBetween,
  easternToday,
  hydrateSeedEntry,
  isIsoDate,
  matchEntriesForArticle,
  missedEntries,
  periodEnd,
  rankEntries,
  selectSlate,
  validateSeedEntry,
  type CalendarEntry,
} from "../lib/coverage-calendar.ts";
import { loadSeed } from "../scripts/coverage-calendar-seed.mjs";
import { sweepMissed } from "../scripts/coverage-calendar-store.mjs";

function entry(overrides: Partial<CalendarEntry> = {}): CalendarEntry {
  const base: CalendarEntry = {
    id: "test-entry",
    event_date: "2026-09-22",
    date_precision: "day",
    confidence: "confirmed",
    headline: "Downtown Commission takes up the demolition application",
    summary: null,
    area_slug: "downtown-columbus",
    area_label: "Downtown Columbus",
    lane: "real-estate",
    neighborhood_candidate: false,
    lead_days: DEFAULT_LEAD_DAYS,
    publish_by: "2026-09-20",
    status: "upcoming",
    priority: 3,
    source_url: "https://example.org/record",
    source_label: "Example",
    source_article_id: "2026-09-03-some-article",
    source_brief: null,
    note: null,
    match_keywords: ["downtown commission"],
    covered_by_article_id: null,
    covered_at: null,
  };
  const merged = { ...base, ...overrides };
  // Keep the fixture self-consistent unless a test overrides publish_by itself.
  if (overrides.event_date && !overrides.publish_by) {
    merged.publish_by = computePublishBy(merged.event_date, merged.lead_days);
  }
  return merged;
}

/* ------------------------------------------------------------- timezone */

test("easternToday reads the Columbus calendar date, not the UTC one", () => {
  // 2026-09-23T03:30:00Z is 11:30 p.m. on Sept. 22 in Columbus (EDT, UTC-4).
  assert.equal(easternToday(new Date("2026-09-23T03:30:00Z")), "2026-09-22");
  // One minute past Eastern midnight rolls the calendar date over.
  assert.equal(easternToday(new Date("2026-09-23T04:01:00Z")), "2026-09-23");
  // The 06:33 Eastern routine slot is 10:33 UTC in summer.
  assert.equal(easternToday(new Date("2026-09-04T10:33:00Z")), "2026-09-04");
});

test("easternToday holds through both DST transitions", () => {
  // Spring forward: 2026-03-08. 06:33 EST on Mar 7 is 11:33 UTC.
  assert.equal(easternToday(new Date("2026-03-07T11:33:00Z")), "2026-03-07");
  // 03:30 UTC on Mar 8 is still 10:30 p.m. Mar 7 in Columbus (EST, UTC-5).
  assert.equal(easternToday(new Date("2026-03-08T03:30:00Z")), "2026-03-07");
  // Fall back: 2026-11-01. 04:30 UTC is 12:30 a.m. Nov 1 (still EDT, UTC-4).
  assert.equal(easternToday(new Date("2026-11-01T04:30:00Z")), "2026-11-01");
  // 06:33 EST on Nov 2 is 11:33 UTC.
  assert.equal(easternToday(new Date("2026-11-02T11:33:00Z")), "2026-11-02");
});

test("date arithmetic crosses DST, month ends and leap days without drift", () => {
  // A publish-by computed across the spring-forward boundary must stay two
  // whole calendar days, not 47 hours rounded down to one.
  assert.equal(computePublishBy("2026-03-09"), "2026-03-07");
  assert.equal(computePublishBy("2026-11-03"), "2026-11-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(daysBetween("2026-03-07", "2026-03-09"), 2);
  assert.equal(daysBetween("2026-11-01", "2026-11-03"), 2);
  assert.equal(daysBetween("2026-09-22", "2026-09-04"), -18);
});

test("isIsoDate rejects shapes that look like dates but are not", () => {
  assert.equal(isIsoDate("2026-09-22"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026-13-01"), false);
  assert.equal(isIsoDate("2026-9-2"), false);
  assert.equal(isIsoDate("Sep 22, 2026"), false);
  assert.equal(isIsoDate(20260922), false);
});

/* ------------------------------------------------------ publish-by rule */

test("publish-by defaults to the event date minus two days", () => {
  // Two days is not arbitrary: the Aug 27 traffic record came from a story
  // published on Aug 25.
  assert.equal(DEFAULT_LEAD_DAYS, 2);
  assert.equal(computePublishBy("2026-08-27"), "2026-08-25");
  assert.equal(computePublishBy("2026-09-22", 5), "2026-09-17");
  assert.equal(computePublishBy("2026-09-22", 0), "2026-09-22");
  assert.throws(() => computePublishBy("2026-09-22", -1), TypeError);
  assert.throws(() => computePublishBy("22-09-2026"), TypeError);
});

/* --------------------------------------------------------- transitions */

test("an entry moves upcoming to due to overdue to missed as the date passes", () => {
  const target = entry({ event_date: "2026-09-22" }); // publish_by 2026-09-20
  assert.equal(classifyEntry(target, "2026-09-01"), "upcoming");
  assert.equal(classifyEntry(target, "2026-09-19"), "upcoming");
  assert.equal(classifyEntry(target, "2026-09-20"), "due");
  // Past the ideal publish date but the event has not happened: the spike is
  // still ahead of us, so this is overdue, not missed.
  assert.equal(classifyEntry(target, "2026-09-21"), "overdue");
  assert.equal(classifyEntry(target, "2026-09-22"), "overdue");
  assert.equal(classifyEntry(target, "2026-09-23"), "missed");
});

test("covered and cancelled are terminal, whatever the date says", () => {
  const covered = entry({ status: "covered" });
  const cancelled = entry({ status: "cancelled" });
  for (const day of ["2026-09-01", "2026-09-20", "2026-10-01"]) {
    assert.equal(classifyEntry(covered, day), "covered");
    assert.equal(classifyEntry(cancelled, day), "cancelled");
  }
});

test("a stale stored status cannot make the report lie", () => {
  // Still stored as upcoming because no sweep has run yet — the classifier
  // derives the truth from the dates anyway.
  assert.equal(classifyEntry(entry({ status: "upcoming" }), "2026-10-05"), "missed");
});

test("month-precision entries are watch items, never due and never missed", () => {
  const watch = entry({ event_date: "2026-09-01", date_precision: "month" });
  assert.equal(periodEnd(watch), "2026-09-30");
  assert.equal(classifyEntry(watch, "2026-08-15"), "watch");
  assert.equal(classifyEntry(watch, "2026-09-04"), "watch");
  assert.equal(classifyEntry(watch, "2026-09-30"), "watch");
  assert.equal(classifyEntry(watch, "2026-10-01"), "stale");
  assert.equal(missedEntries([watch], "2026-11-01").length, 0);
});

test("quarter precision runs to the end of the third month", () => {
  assert.equal(periodEnd(entry({ event_date: "2026-10-01", date_precision: "quarter" })), "2026-12-31");
  assert.equal(periodEnd(entry({ event_date: "2026-12-01", date_precision: "quarter" })), "2027-02-28");
  assert.equal(periodEnd(entry({ event_date: "2026-02-01", date_precision: "month" })), "2026-02-28");
  assert.equal(periodEnd(entry({ event_date: "2028-02-01", date_precision: "month" })), "2028-02-29");
});

test("missedEntries counts only day-precision entries that passed uncovered", () => {
  const entries = [
    entry({ id: "passed", event_date: "2026-09-01" }),
    entry({ id: "covered-in-time", event_date: "2026-09-01", status: "covered" }),
    entry({ id: "cancelled", event_date: "2026-09-01", status: "cancelled" }),
    entry({ id: "still-ahead", event_date: "2026-12-01" }),
  ];
  assert.deepEqual(missedEntries(entries, "2026-09-04").map((item) => item.entry.id), ["passed"]);
});

/* -------------------------------------------------------------- ranking */

test("ranking puts overdue above due above upcoming", () => {
  const entries = [
    entry({ id: "soon", event_date: "2026-09-16" }),
    entry({ id: "due-today", event_date: "2026-09-06" }),
    entry({ id: "slipped", event_date: "2026-09-05" }),
  ];
  const ranked = rankEntries(entries, "2026-09-04");
  assert.deepEqual(ranked.map((item) => item.entry.id), ["slipped", "due-today", "soon"]);
  assert.deepEqual(ranked.map((item) => item.state), ["overdue", "due", "upcoming"]);
});

test("ranking breaks ties on priority, confidence and date precision", () => {
  const entries = [
    entry({ id: "low-priority", event_date: "2026-09-10", priority: 5 }),
    entry({ id: "high-priority", event_date: "2026-09-10", priority: 1 }),
    entry({ id: "unconfirmed", event_date: "2026-09-10", priority: 1, confidence: "unconfirmed", source_url: null }),
  ];
  const ranked = rankEntries(entries, "2026-09-04");
  assert.deepEqual(ranked.map((item) => item.entry.id), ["high-priority", "unconfirmed", "low-priority"]);
});

test("the horizon keeps far-off entries out of today's list", () => {
  const entries = [entry({ id: "far", event_date: "2026-11-21" }), entry({ id: "near", event_date: "2026-09-10" })];
  assert.deepEqual(rankEntries(entries, "2026-09-04").map((item) => item.entry.id), ["near"]);
  assert.deepEqual(
    rankEntries(entries, "2026-09-04", { horizonDays: 90 }).map((item) => item.entry.id),
    ["near", "far"],
  );
});

test("a month-level watch item can never outrank a dated peg", () => {
  const entries = [
    entry({ id: "watch", event_date: "2026-09-01", date_precision: "month", priority: 1 }),
    entry({ id: "dated", event_date: "2026-09-14", priority: 5, confidence: "unconfirmed", source_url: null }),
  ];
  assert.deepEqual(rankEntries(entries, "2026-09-04").map((item) => item.entry.id), ["dated", "watch"]);
});

test("selectSlate returns at most one entry per lane", () => {
  const entries = [
    entry({ id: "re-1", event_date: "2026-09-05", lane: "real-estate" }),
    entry({ id: "re-2", event_date: "2026-09-06", lane: "real-estate" }),
    entry({ id: "life-1", event_date: "2026-09-08", lane: "lifestyle" }),
  ];
  const slate = selectSlate(rankEntries(entries, "2026-09-04"));
  assert.equal(slate["real-estate"]?.entry.id, "re-1");
  assert.equal(slate.lifestyle?.entry.id, "life-1");
});

test("selectSlate reports an empty lane rather than borrowing from the other", () => {
  const slate = selectSlate(rankEntries([entry({ id: "only-re", event_date: "2026-09-05" })], "2026-09-04"));
  assert.equal(slate["real-estate"]?.entry.id, "only-re");
  assert.equal(slate.lifestyle, null);
});

/* ------------------------------------------------------------- matching */

test("matching requires every keyword and a publish inside the window", () => {
  const entries = [entry({ id: "gay-st", event_date: "2026-09-22", match_keywords: ["downtown commission", "gay st"] })];
  const covering = {
    title: "Downtown Commission Denies Gay St. Demolition",
    body: "The Downtown Commission voted on the 197 E. Gay Street application.",
    publishedOn: "2026-09-22",
  };
  assert.deepEqual(matchEntriesForArticle(entries, covering).map((item) => item.id), ["gay-st"]);

  // One keyword missing.
  assert.deepEqual(
    matchEntriesForArticle(entries, { ...covering, title: "Gay St. Building Sells", body: "No commission here." }),
    [],
  );
  // Right words, but months early — a passing mention must not close an entry.
  assert.deepEqual(matchEntriesForArticle(entries, { ...covering, publishedOn: "2026-07-01" }), []);
  // And not long after the fact either.
  assert.deepEqual(matchEntriesForArticle(entries, { ...covering, publishedOn: "2026-10-15" }), []);
});

test("matching skips entries that are already covered or cancelled", () => {
  const article = { title: "Downtown Commission acts", body: "gay st", publishedOn: "2026-09-22" };
  assert.equal(matchEntriesForArticle([entry({ status: "covered" })], article).length, 0);
  assert.equal(matchEntriesForArticle([entry({ status: "cancelled" })], article).length, 0);
  assert.equal(matchEntriesForArticle([entry({ match_keywords: [] })], article).length, 0);
});

/* ------------------------------------------------------------ reporting */

test("the brief block names one pick per lane and shows the missed count", () => {
  const entries = [
    entry({ id: "re-due", event_date: "2026-09-06", lane: "real-estate" }),
    entry({ id: "life-soon", event_date: "2026-09-12", lane: "lifestyle" }),
    entry({ id: "gone", event_date: "2026-08-20", lane: "real-estate" }),
  ];
  const block = buildBriefSection(entries, "2026-09-04");
  assert.match(block, /## Coverage calendar — 2026-09-04/);
  assert.match(block, /missed all-time 1/);
  assert.match(block, /### Due today/);
  assert.match(block, /### Missed — date passed with no CREN coverage/);
  assert.match(block, /\*\*real-estate\*\* — .*due/);
  assert.match(block, /\*\*lifestyle\*\* — /);
});

test("the brief block says so plainly when nothing is due", () => {
  const block = buildBriefSection([entry({ event_date: "2027-06-30" })], "2026-09-04");
  assert.match(block, /\*\*real-estate\*\* — nothing on the calendar is due/);
  assert.match(block, /\*\*lifestyle\*\* — nothing on the calendar is due/);
});

/* ---------------------------------------------------------------- sweep */

test("the sweep refuses a future date before it touches the database", async () => {
  // Guards the missed count, which is the number that says whether the
  // calendar is working. A stub client proves the check runs first: if the
  // guard let this through, the sweep would try to query and fail differently.
  const exploding = () => {
    throw new Error("the sweep must not reach the database with a future date");
  };
  const tomorrow = addDays(easternToday(), 1);
  await assert.rejects(() => sweepMissed(exploding, tomorrow), /Refusing to sweep with a future date/);
});

/* ------------------------------------------------------------ seed file */

test("validateSeedEntry refuses an entry with no article and no brief behind it", () => {
  const good = {
    id: "some-milestone",
    event_date: "2026-10-24",
    date_precision: "day",
    confidence: "confirmed",
    headline: "Public comment closes",
    area_label: "Columbus citywide",
    lane: "real-estate",
    source_url: "https://www.columbus.gov/zoningupdate",
    source_article_id: "2026-08-23-some-article",
  };
  assert.deepEqual(validateSeedEntry(good), []);
  assert.deepEqual(validateSeedEntry({ ...good, source_article_id: undefined }), [
    "every entry must cite source_article_id or source_brief",
  ]);
  assert.deepEqual(validateSeedEntry({ ...good, source_url: undefined }), [
    "a confirmed or reported entry needs the source_url that establishes the date",
  ]);
  assert.deepEqual(validateSeedEntry({ ...good, event_date: "2026-02-30" }), ["event_date must be YYYY-MM-DD"]);
  assert.deepEqual(validateSeedEntry({ ...good, lane: "sports" }), ["lane must be one of real-estate, lifestyle"]);
});

test("a month-precision date may not be sharpened into a day", () => {
  const monthly = {
    id: "devon-triangle-phase-2",
    event_date: "2026-09-15",
    date_precision: "month",
    confidence: "reported",
    headline: "Phase 2 construction start",
    area_label: "Devon Triangle",
    lane: "real-estate",
    source_url: "https://www.habitatmidohio.org/what-we-do/devon-triangle.html",
    source_brief: "briefs/2026-08-24.md",
  };
  assert.deepEqual(validateSeedEntry(monthly), [
    "a month-precision date must be recorded on the first of the month, not sharpened to a day",
  ]);
  assert.deepEqual(validateSeedEntry({ ...monthly, event_date: "2026-09-01" }), []);
});

test("hydrateSeedEntry derives publish_by rather than trusting a stored one", () => {
  const hydrated = hydrateSeedEntry({
    id: "x-y-z",
    event_date: "2026-11-21",
    date_precision: "day",
    confidence: "confirmed",
    headline: "Market opens",
    area_label: "Dublin",
    lane: "lifestyle",
    source_url: "https://example.org",
    source_article_id: "a",
    publish_by: "1999-01-01",
  });
  assert.equal(hydrated.publish_by, "2026-11-19");
  assert.equal(hydrated.status, "upcoming");
  assert.deepEqual(hydrated.match_keywords, []);
});

test("the committed seed file is valid and fully sourced", () => {
  const entries = loadSeed();
  assert.ok(entries.length > 0, "seed should not be empty");
  for (const item of entries) {
    assert.ok(
      item.source_article_id || item.source_brief,
      `${item.id} must cite the article or brief its date came from`,
    );
    assert.equal(item.publish_by, computePublishBy(item.event_date, item.lead_days));
    assert.ok(item.publish_by <= item.event_date);
    if (item.confidence !== "unconfirmed") {
      assert.ok(item.source_url, `${item.id} must record the URL that establishes the date`);
    }
  }
  const ids = entries.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, "seed ids must be unique");
});

test("the seed carries the three milestones the newsroom already knows about", () => {
  const byId = new Map(loadSeed().map((item) => [item.id, item]));
  assert.equal(byId.get("downtown-commission-197-e-gay-demolition-vote")?.event_date, "2026-09-22");
  assert.equal(byId.get("zone-in-phase-2-comment-close")?.event_date, "2026-10-24");
  assert.equal(byId.get("dublin-christkindlmarkt-opens")?.event_date, "2026-11-21");
  assert.equal(byId.get("dublin-christkindlmarkt-opens")?.publish_by, "2026-11-19");
});
