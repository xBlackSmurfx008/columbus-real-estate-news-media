import { strict as assert } from "node:assert";
import test from "node:test";

import {
  DEFAULT_WINDOW_DAYS,
  MISSING_UNIT_ECONOMICS,
  articleOutcomeVerdict,
  evaluateReadinessGates,
  formatMinutes,
  formatMoneyCents,
  formatTrend,
  marketDataAgeDays,
  markdownTable,
  median,
  northStarFreeMemberConversion,
  northStarQualifiedLeadsPerThousand,
  northStarValuePerThousand,
  parseWindowDays,
  perThousand,
  rate,
  summarizeArticleOutcomes,
  summarizeMarketDataHealth,
  trend,
  windowBounds,
} from "../scripts/scorecard-lib.mjs";

/* ------------------------------------------------------------------ windows */

test("parseWindowDays defaults, reads --window, and rejects nonsense", () => {
  assert.equal(parseWindowDays([]), DEFAULT_WINDOW_DAYS);
  assert.equal(parseWindowDays(["--window", "30"]), 30);
  for (const bad of ["0", "-7", "abc", "7.5", "400", undefined]) {
    assert.throws(() => parseWindowDays(["--window", bad]), /--window must be/);
  }
});

test("windowBounds produces two equal, adjacent, non-overlapping periods", () => {
  const now = new Date("2026-09-04T12:00:00Z");
  const { current, prior } = windowBounds(7, now);
  assert.equal(current.end.toISOString(), now.toISOString());
  assert.equal(current.start.toISOString(), "2026-08-28T12:00:00.000Z");
  assert.equal(prior.end.toISOString(), current.start.toISOString(), "prior must end exactly where current begins");
  assert.equal(prior.start.toISOString(), "2026-08-21T12:00:00.000Z");
  assert.equal(
    current.end - current.start,
    prior.end - prior.start,
    "comparing windows of different lengths would fabricate a trend",
  );
});

/* ------------------------------------------------------------------- trends */

test("trend reports direction and percent change", () => {
  const up = trend(77, 60);
  assert.equal(up.delta, 17);
  assert.equal(up.direction, "up");
  assert.ok(Math.abs(up.pctChange - 28.333) < 0.01);
  assert.equal(up.improved, true);

  const down = trend(61, 64);
  assert.equal(down.direction, "down");
  assert.equal(down.improved, false);
});

test("trend respects betterWhen without changing the arithmetic", () => {
  const fewerBreaches = trend(1, 4, { betterWhen: "lower" });
  assert.equal(fewerBreaches.delta, -3, "arithmetic is unaffected by the goal direction");
  assert.equal(fewerBreaches.direction, "down");
  assert.equal(fewerBreaches.improved, true, "fewer SLA breaches is an improvement");
  assert.equal(trend(5, 5, { betterWhen: "lower" }).improved, null);
  assert.equal(trend(3, 1, { betterWhen: "neutral" }).improved, null);
});

test("formatTrend never invents a percentage against a zero baseline", () => {
  assert.equal(formatTrend(trend(0, 0)), "— no change");
  assert.equal(formatTrend(trend(3, 0)), "+3 (new) ▲");
  assert.equal(formatTrend(trend(0, 4)), "-4 (-100.0%) ▼");
  assert.match(formatTrend(trend(77, 102)), /^-25 \(-24\.5%\) ▼$/);
});

/* -------------------------------------------------------- honest zero rules */

test("rate returns n/a with a reason when the denominator is zero", () => {
  const empty = rate(0, 0, { denominatorLabel: "sessions" });
  assert.equal(empty.value, null);
  assert.equal(empty.display, "n/a");
  assert.equal(empty.reason, "no sessions in window");

  const real = rate(1, 61, { denominatorLabel: "sessions", digits: 2 });
  assert.equal(real.display, "1.64%");
  assert.equal(real.reason, null);
});

test("a genuine zero numerator is 0%, never n/a", () => {
  const zeroConversions = rate(0, 61, { denominatorLabel: "sessions", digits: 2 });
  assert.equal(zeroConversions.display, "0.00%");
  assert.equal(zeroConversions.value, 0);
  assert.equal(zeroConversions.reason, null);
});

test("perThousand behaves the same way", () => {
  assert.equal(perThousand(0, 0).display, "n/a");
  assert.equal(perThousand(0, 61).display, "0.00");
  assert.equal(perThousand(3, 1500).display, "2.00");
});

test("median returns null for no samples rather than a flattering zero", () => {
  assert.equal(median([]), null);
  assert.equal(median([10]), 10);
  assert.equal(median([10, 20, 30]), 20);
  assert.equal(median([10, 20, 30, 40]), 25);
  assert.equal(formatMinutes(median([])), "n/a");
});

test("formatMinutes and formatMoneyCents", () => {
  assert.equal(formatMinutes(45), "45 min");
  assert.equal(formatMinutes(90), "1.5 h");
  assert.equal(formatMinutes(2880), "2.0 d");
  assert.equal(formatMinutes(null), "n/a");
  assert.equal(formatMinutes(-5), "n/a");
  assert.equal(formatMoneyCents(0), "$0.00");
  assert.equal(formatMoneyCents(125_000), "$1,250.00");
});

/* -------------------------------------------------------------- north stars */

test("north star 1: qualified leads per 1,000 sessions", () => {
  const live = northStarQualifiedLeadsPerThousand({ qualifiedLeads: 3, sessions: 1500 });
  assert.equal(live.display, "2.00");
  assert.match(live.basis, /3 qualified lead\(s\) \/ 1,500 session\(s\) × 1,000/);

  const trueZero = northStarQualifiedLeadsPerThousand({ qualifiedLeads: 0, sessions: 61 });
  assert.equal(trueZero.display, "0.00", "traffic with no leads is a zero, not n/a");
  assert.match(trueZero.note, /true zero/);

  const noTraffic = northStarQualifiedLeadsPerThousand({ qualifiedLeads: 0, sessions: 0 });
  assert.equal(noTraffic.display, "n/a", "no sessions means no rate exists");
  assert.match(noTraffic.note, /no sessions in window/);
});

test("north star 2: free-member conversion rate", () => {
  assert.equal(northStarFreeMemberConversion({ signups: 1, sessions: 200 }).display, "0.50%");
  assert.equal(northStarFreeMemberConversion({ signups: 0, sessions: 61 }).display, "0.00%");
  assert.equal(northStarFreeMemberConversion({ signups: 0, sessions: 0 }).display, "n/a");
});

test("north star 3 is n/a while unit economics are unknown, and says which inputs are missing", () => {
  const star = northStarValuePerThousand({
    revenueCents: 0,
    sessions: 61,
    recordedSources: [{ label: "insertion_orders", rows: 0 }],
    unitEconomicsKnown: false,
  });
  assert.equal(star.display, "n/a");
  assert.equal(star.value, null);
  assert.equal(star.recordedRevenueCents, 0, "the cash half is still reported as a real number");
  for (const input of MISSING_UNIT_ECONOMICS) {
    assert.ok(star.note.includes(input), `the reason must name the missing input: ${input}`);
  }
});

test("north star 3 computes normally once unit economics exist", () => {
  const star = northStarValuePerThousand({
    revenueCents: 250_000,
    sessions: 5000,
    recordedSources: [{ label: "insertion_orders", rows: 2 }],
    unitEconomicsKnown: true,
  });
  assert.equal(star.display, "$500.00 per 1,000 sessions");
  assert.equal(star.value, 500_00);
});

test("north star 3 never extrapolates a one-week figure", () => {
  const star = northStarValuePerThousand({ revenueCents: 10_000, sessions: 100, unitEconomicsKnown: true });
  assert.equal(star.value, 100_000, "value is per 1,000 sessions of the window, not annualized");
  assert.ok(!/annual|year|project|forecast|run rate/i.test(`${star.display} ${star.basis} ${star.note}`));
});

/* -------------------------------------------------- traffic-to-action rollup */

test("summarizeArticleOutcomes counts actions, not impressions", () => {
  const summary = summarizeArticleOutcomes([
    { id: "a", title: "A", views: 100, ctaViews: 50, ctaClicks: 5, signups: 1, leads: 0, publishedInWindow: true },
    { id: "b", title: "B", views: 40, ctaViews: 20, ctaClicks: 0, signups: 0, leads: 0, publishedInWindow: true },
    { id: "c", title: "C", views: 0, ctaViews: 0, ctaClicks: 0, signups: 0, leads: 2, publishedInWindow: false },
  ]);

  assert.equal(summary.totals.articlesConsidered, 3);
  assert.equal(summary.totals.articlesWithViews, 2);
  assert.equal(summary.totals.articlesWithAction, 2, "A (6 actions) and C (2 leads)");
  assert.equal(summary.totals.actions, 8);
  assert.equal(summary.articles[0].id, "a", "sorted by actions descending");
  assert.equal(summary.articles[0].actions, 6);
  assert.equal(summary.articles[0].ctaCtr.display, "10.0%");

  const seenOnly = summary.articles.find((a) => a.id === "b");
  assert.equal(seenOnly.actions, 0, "a CTA that was seen but not clicked is not an action");
  assert.equal(seenOnly.ctaCtr.display, "0.0%");
});

test("summarizeArticleOutcomes reports zero-view articles without dividing by zero", () => {
  const summary = summarizeArticleOutcomes([
    { id: "a", title: "A", views: 0, ctaViews: 0, ctaClicks: 0, signups: 0, leads: 0, publishedInWindow: true },
  ]);
  assert.equal(summary.articles[0].actionRate.display, "n/a");
  assert.equal(summary.articles[0].ctaCtr.display, "n/a");
  assert.equal(summary.totals.publishedInWindowWithAction, 0);
});

test("articleOutcomeVerdict distinguishes the three different zeros", () => {
  assert.match(
    articleOutcomeVerdict(summarizeArticleOutcomes([]).totals),
    /nothing was measured as read/,
    "no articles at all",
  );
  assert.match(
    articleOutcomeVerdict(summarizeArticleOutcomes([
      { id: "a", title: "A", views: 0, publishedInWindow: true },
    ]).totals),
    /produced no readers/,
    "articles but no traffic",
  );
  assert.match(
    articleOutcomeVerdict(summarizeArticleOutcomes([
      { id: "a", title: "A", views: 56, publishedInWindow: true },
    ]).totals),
    /readers and zero business outcomes/,
    "traffic but no actions",
  );
  assert.match(
    articleOutcomeVerdict(summarizeArticleOutcomes([
      { id: "a", title: "A", views: 56, ctaClicks: 2, publishedInWindow: true },
    ]).totals),
    /produced at least one action/,
  );
});

/* ------------------------------------------------------ market data staleness */

test("marketDataAgeDays measures against the as-of date", () => {
  const now = new Date("2026-09-04T00:00:00Z");
  assert.equal(marketDataAgeDays("2026-08-29", now), 6);
  assert.equal(marketDataAgeDays(null, now), null);
  assert.equal(marketDataAgeDays("not-a-date", now), null);
});

test("summarizeMarketDataHealth separates 'inconsistent' from 'consistent but stale'", () => {
  const now = new Date("2026-09-04T00:00:00Z");
  const fresh = summarizeMarketDataHealth({ verifierPassed: true, oldestAsOf: "2026-08-29", metricCount: 20, now });
  assert.equal(fresh.status, "PASS");
  assert.equal(fresh.stale, false);

  const stale = summarizeMarketDataHealth({ verifierPassed: true, oldestAsOf: "2026-05-01", metricCount: 20, now });
  assert.equal(stale.stale, true);
  assert.match(stale.status, /PASS but stale/);

  const broken = summarizeMarketDataHealth({ verifierPassed: false, oldestAsOf: "2026-08-29", metricCount: 20, now });
  assert.match(broken.status, /FAIL/);

  const unchecked = summarizeMarketDataHealth({ verifierPassed: null, oldestAsOf: null, metricCount: 0, now });
  assert.equal(unchecked.status, "not checked");
  assert.equal(unchecked.oldestAgeDays, null);
});

/* ------------------------------------------------------------ revenue gates */

test("readiness gates stay closed until every condition is met", () => {
  const today = evaluateReadinessGates({
    monthlyPageviews: 179,
    realMembers: 0,
    realSubscribers: 1,
    newsletterSendsShipped: 0,
    affiliateProgramJoined: false,
    thirtyDayReturnRate: null,
  });
  const byLine = Object.fromEntries(today.map((g) => [g.line, g]));

  assert.equal(byLine["Lead intake"].status, "OPEN", "lead intake is open now; it is the business");
  assert.equal(byLine["Display / native advertising"].status, "CLOSED");
  assert.equal(byLine["Newsletter sponsorship"].status, "CLOSED");
  assert.equal(byLine["Paid membership"].status, "CLOSED");
  assert.equal(byLine["Affiliate"].status, "CLOSED");

  const displayConds = byLine["Display / native advertising"].conditions;
  assert.ok(displayConds.every((c) => !c.met), "179 pageviews and 0 members meet nothing");
  assert.match(byLine["Paid membership"].conditions[0].actual, /n\/a/, "return rate is unmeasurable, not 0%");
});

test("a gate opens only when its conditions are genuinely satisfied", () => {
  const later = evaluateReadinessGates({
    monthlyPageviews: 12000,
    realMembers: 400,
    realSubscribers: 900,
    newsletterSendsShipped: 6,
    affiliateProgramJoined: true,
    thirtyDayReturnRate: 24.5,
  });
  const byLine = Object.fromEntries(later.map((g) => [g.line, g]));
  assert.equal(byLine["Newsletter sponsorship"].status, "OPEN");
  assert.equal(byLine["Paid membership"].status, "OPEN");
  assert.equal(byLine["Affiliate"].status, "OPEN");
  assert.equal(
    byLine["Display / native advertising"].status,
    "CLOSED",
    "the two-consecutive-months condition is not evaluable from one window, so display stays closed",
  );
});

/* ---------------------------------------------------------------- rendering */

test("markdownTable emits a pasteable table", () => {
  const table = markdownTable(["A", "B"], [["1", "2"], ["3", "4"]]);
  assert.equal(table.split("\n").length, 4);
  assert.equal(table.split("\n")[0], "| A | B |");
  assert.equal(table.split("\n")[1], "|---|---|");
});
