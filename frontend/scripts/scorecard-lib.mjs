// Pure computation for the weekly operating scorecard (owner plan 2026-09-04,
// item 11). No database, no I/O, no formatting of anything that needs a live
// connection — so every number in the report can be unit-tested.
//
// TRUTH RULES encoded here, because a scorecard nobody trusts is worse than no
// scorecard:
//   1. Nothing is ever extrapolated. There is no annualization, no run rate, no
//      projection. A one-week number is reported as a one-week number.
//   2. A rate with a zero denominator is `n/a` plus the reason, never 0% and
//      never a borrowed denominator from another period.
//   3. A genuine zero is printed as a zero and said out loud. `0` and
//      `not measured` are different answers and are never collapsed.

/* ----------------------------------------------------------------- windows */

export const DEFAULT_WINDOW_DAYS = 7;

/** Parse `--window N` out of argv. Rejects anything that is not a positive integer. */
export function parseWindowDays(argv, fallback = DEFAULT_WINDOW_DAYS) {
  const index = argv.indexOf("--window");
  if (index < 0) return fallback;
  const raw = argv[index + 1];
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > 365) {
    throw new Error(`--window must be a whole number of days between 1 and 365 (got "${raw ?? ""}")`);
  }
  return value;
}

/**
 * The two comparison periods. `current` is the last N days ending now; `prior`
 * is the N days immediately before it, so the two are the same length and never
 * overlap. Every trend in the report is this comparison and only this one.
 */
export function windowBounds(windowDays, now = new Date()) {
  const dayMs = 86_400_000;
  const end = new Date(now.getTime());
  const start = new Date(end.getTime() - windowDays * dayMs);
  const priorStart = new Date(end.getTime() - 2 * windowDays * dayMs);
  return {
    windowDays,
    current: { start, end },
    prior: { start: priorStart, end: start },
  };
}

export function isoDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ trends */

/**
 * Compare a metric across the two windows.
 *
 * `betterWhen` only affects the plain-English word ("better"/"worse"); it never
 * changes the arithmetic. Metrics where neither direction is good (a mix
 * percentage, say) use "neutral".
 */
export function trend(current, prior, { betterWhen = "higher" } = {}) {
  const cur = Number(current ?? 0);
  const pre = Number(prior ?? 0);
  const delta = cur - pre;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const pctChange = pre === 0 ? null : (delta / Math.abs(pre)) * 100;
  const improved = betterWhen === "neutral" || delta === 0
    ? null
    : betterWhen === "higher" ? delta > 0 : delta < 0;
  return { current: cur, prior: pre, delta, direction, pctChange, betterWhen, improved };
}

const ARROW = { up: "▲", down: "▼", flat: "—" };

/** Render a trend as one cell: `+12 (+18.5%) ▲`, `new`, `— no change`. */
export function formatTrend(t, { unit = "" } = {}) {
  if (t.delta === 0) return "— no change";
  const sign = t.delta > 0 ? "+" : "";
  const magnitude = `${sign}${formatNumber(t.delta)}${unit}`;
  if (t.prior === 0) return `${magnitude} (new) ${ARROW[t.direction]}`;
  const pct = `${t.pctChange > 0 ? "+" : ""}${t.pctChange.toFixed(1)}%`;
  return `${magnitude} (${pct}) ${ARROW[t.direction]}`;
}

/* --------------------------------------------------------------- formatting */

export function formatNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "n/a";
  const n = Number(value);
  return Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatMoneyCents(cents) {
  const n = Number(cents ?? 0);
  if (!Number.isFinite(n)) return "n/a";
  return `$${(n / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * A rate that refuses to lie. Returns `{ value, display, reason }`; `value` is
 * null and `display` is `n/a` whenever the denominator is zero, with the reason
 * naming the missing input rather than hiding it.
 */
export function rate(numerator, denominator, { denominatorLabel = "denominator", digits = 1 } = {}) {
  const num = Number(numerator ?? 0);
  const den = Number(denominator ?? 0);
  if (!Number.isFinite(den) || den <= 0) {
    return { value: null, display: "n/a", reason: `no ${denominatorLabel} in window` };
  }
  const value = (num / den) * 100;
  return { value, display: `${value.toFixed(digits)}%`, reason: null };
}

/** Count per 1,000 of something. Same zero-denominator honesty as `rate`. */
export function perThousand(count, denominator, { denominatorLabel = "sessions", digits = 2 } = {}) {
  const num = Number(count ?? 0);
  const den = Number(denominator ?? 0);
  if (!Number.isFinite(den) || den <= 0) {
    return { value: null, display: "n/a", reason: `no ${denominatorLabel} in window` };
  }
  const value = (num / den) * 1000;
  return { value, display: value.toFixed(digits), reason: null };
}

/** Minutes -> a duration a human reads at a glance. */
export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined || !Number.isFinite(Number(minutes)) || Number(minutes) < 0) {
    return "n/a";
  }
  const m = Number(minutes);
  if (m < 60) return `${Math.round(m)} min`;
  if (m < 60 * 24) return `${(m / 60).toFixed(1)} h`;
  return `${(m / (60 * 24)).toFixed(1)} d`;
}

/** Median of a numeric array; null for an empty array (never 0). */
export function median(values) {
  const nums = (values ?? []).map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

export function markdownTable(headers, rows) {
  const lines = [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`];
  for (const row of rows) lines.push(`| ${row.join(" | ")} |`);
  return lines.join("\n");
}

/* -------------------------------------------------------------- north stars */

/**
 * The owner's three north-star numbers, computed explicitly so the arithmetic
 * is inspectable in the report itself rather than buried in a query.
 *
 * Each returns `{ key, label, display, basis, note }`:
 *   display — the number, or `n/a`
 *   basis   — the literal arithmetic, e.g. "0 qualified leads / 61 sessions × 1,000"
 *   note    — why it is n/a, or what the number does and does not include
 */
export function northStarQualifiedLeadsPerThousand({ qualifiedLeads, sessions }) {
  const result = perThousand(qualifiedLeads, sessions, { denominatorLabel: "sessions" });
  return {
    key: "qualified_leads_per_1k",
    label: "Qualified leads per 1,000 sessions",
    display: result.display,
    value: result.value,
    basis: `${formatNumber(qualifiedLeads)} qualified lead(s) / ${formatNumber(sessions)} session(s) × 1,000`,
    note: result.reason
      ? `n/a: ${result.reason}. The numerator is not the problem — there is no traffic to divide by.`
      : qualifiedLeads === 0
        ? "A true zero: real traffic arrived and produced no lead the desk qualified."
        : null,
  };
}

export function northStarFreeMemberConversion({ signups, sessions }) {
  const result = rate(signups, sessions, { denominatorLabel: "sessions", digits: 2 });
  return {
    key: "free_member_conversion",
    label: "Free-member conversion rate",
    display: result.display,
    value: result.value,
    basis: `${formatNumber(signups)} new free member(s) / ${formatNumber(sessions)} session(s)`,
    note: result.reason
      ? `n/a: ${result.reason}.`
      : signups === 0
        ? "A true zero: real traffic arrived and nobody joined."
        : null,
  };
}

/**
 * The six unit-economics inputs the owner still has to supply before any
 * lead can be assigned a dollar value (see .claude/skills/cren-revenue).
 * Until these exist, the "value" half of north star 3 has no definition, and
 * inventing one would be exactly the fabrication this report exists to prevent.
 */
export const MISSING_UNIT_ECONOMICS = [
  "Average gross profit on a FSBO acquisition that closes",
  "Close rate from a qualified FSBO lead to a signed deal",
  "The same two figures for an investor-property acquisition",
  "What a capital-partner relationship is worth",
  "Whether a renter lead has direct monetary value or is purely audience-building",
  "Target cost per qualified lead",
];

/**
 * Revenue / value per 1,000 sessions.
 *
 * This has two halves and they fail differently:
 *   - Recorded revenue is knowable. `revenueCents` is what the database
 *     actually holds; $0 is reported as $0, with the tables that were read.
 *   - Lead *value* is NOT knowable today. CREN has no unit economics, so no
 *     lead can be priced. The composite number is therefore `n/a` — reporting
 *     the cash half alone as if it were the whole number would understate a
 *     lead-intake business, and pricing the leads would be invention.
 * The scorecard prints both facts rather than resolving them into one flattering
 * or one falsely bleak figure.
 */
export function northStarValuePerThousand({ revenueCents, sessions, recordedSources = [], unitEconomicsKnown = false }) {
  const cash = perThousand(revenueCents, sessions, { denominatorLabel: "sessions" });
  const inspected = recordedSources.map((source) => `${source.label}: ${formatNumber(source.rows)} row(s)`).join("; ");

  if (!unitEconomicsKnown) {
    return {
      key: "value_per_1k",
      label: "Revenue / value per 1,000 sessions",
      display: "n/a",
      value: null,
      basis: cash.value === null
        ? `${formatMoneyCents(revenueCents)} recorded revenue / no sessions; lead value undefined`
        : `${formatMoneyCents(revenueCents)} recorded revenue / ${formatNumber(sessions)} session(s) × 1,000 ` +
          `= ${formatMoneyCents(cash.value)}; lead-value component undefined`,
      note: "n/a: the cash half is real and is $" + (Number(revenueCents ?? 0) / 100).toFixed(2) +
        ` (read from ${inspected || "no revenue tables"}), but CREN has no unit economics, so the value of a ` +
        "lead cannot be priced and the composite number has no definition. Missing inputs: " +
        MISSING_UNIT_ECONOMICS.join("; ") + ".",
      recordedRevenueCents: Number(revenueCents ?? 0),
      recordedRevenuePerThousand: cash,
    };
  }

  return {
    key: "value_per_1k",
    label: "Revenue / value per 1,000 sessions",
    display: cash.value === null ? "n/a" : `${formatMoneyCents(cash.value)} per 1,000 sessions`,
    value: cash.value,
    basis: `${formatMoneyCents(revenueCents)} recorded value / ${formatNumber(sessions)} session(s) × 1,000`,
    note: cash.reason
      ? `n/a: ${cash.reason}.`
      : `Counts only value recorded in the database (${inspected || "no revenue tables read"}).`,
    recordedRevenueCents: Number(revenueCents ?? 0),
    recordedRevenuePerThousand: cash,
  };
}

/* ------------------------------------------------------- commercial gates */

/**
 * The readiness gates from .claude/skills/cren-revenue. A line does not open
 * until its gate is met; the scorecard's job is to say how far away each one is
 * using only measured numbers.
 *
 * `evaluateReadinessGates` returns one row per line with every condition scored
 * individually, so "not ready" always comes with which condition failed.
 */
export function evaluateReadinessGates({
  monthlyPageviews,
  realMembers,
  realSubscribers,
  newsletterSendsShipped,
  affiliateProgramJoined,
  thirtyDayReturnRate,
}) {
  const cond = (label, actual, required, met) => ({ label, actual, required, met });

  const displayConds = [
    cond("Monthly pageviews", formatNumber(monthlyPageviews), "≥ 5,000", monthlyPageviews >= 5000),
    cond("Real members", formatNumber(realMembers), "≥ 250", realMembers >= 250),
    cond("Sustained 2 consecutive months", "not yet evaluable", "2 months at the above", false),
  ];
  const newsletterConds = [
    cond("Real subscribers", formatNumber(realSubscribers), "≥ 500", realSubscribers >= 500),
    cond("Consecutive newsletter sends", formatNumber(newsletterSendsShipped ?? 0), "≥ 4", (newsletterSendsShipped ?? 0) >= 4),
  ];
  const membershipConds = [
    cond(
      "30-day return rate",
      thirtyDayReturnRate === null ? "n/a — not measurable" : `${thirtyDayReturnRate.toFixed(1)}%`,
      "≥ 20%",
      thirtyDayReturnRate !== null && thirtyDayReturnRate >= 20,
    ),
  ];

  const lines = [
    {
      line: "Lead intake",
      status: "OPEN",
      detail: "Funnels, SLA queue, and disclosure are live. This is the business; everything else is secondary.",
      conditions: [],
    },
    {
      line: "Affiliate",
      status: affiliateProgramJoined ? "OPEN" : "CLOSED",
      detail: affiliateProgramJoined
        ? "A real program is joined and its FTC block ships."
        : "No real affiliate program is joined yet. Opens when one is, with its FTC block shipped.",
      conditions: [],
    },
    {
      line: "Display / native advertising",
      status: displayConds.every((c) => c.met) ? "OPEN" : "CLOSED",
      detail: "Never name an advertiser that has not signed.",
      conditions: displayConds,
    },
    {
      line: "Newsletter sponsorship",
      status: newsletterConds.every((c) => c.met) ? "OPEN" : "CLOSED",
      detail: "No newsletter has ever been sent.",
      conditions: newsletterConds,
    },
    {
      line: "Paid membership",
      status: membershipConds.every((c) => c.met) ? "OPEN" : "CLOSED",
      detail: "Return rate is unmeasurable while visitor hashes rotate daily by design (privacy). " +
        "Measuring it requires a logged-in member signal, not more analytics.",
      conditions: membershipConds,
    },
  ];

  return lines;
}

/* ------------------------------------------- traffic-to-action per article */

/**
 * The report's most important computation: what did publishing actually
 * produce? One row per article, `actions` = CTA clicks + membership signups +
 * lead submissions attributed to it. CTA *views* are deliberately not an action
 * — being seen is not doing something.
 */
export function summarizeArticleOutcomes(rows) {
  const articles = (rows ?? []).map((row) => {
    const ctaClicks = Number(row.ctaClicks ?? 0);
    const signups = Number(row.signups ?? 0);
    const leads = Number(row.leads ?? 0);
    const views = Number(row.views ?? 0);
    const ctaViews = Number(row.ctaViews ?? 0);
    return {
      id: row.id,
      title: row.title,
      slug: row.slug ?? null,
      publishedInWindow: Boolean(row.publishedInWindow),
      views,
      sessions: Number(row.sessions ?? 0),
      ctaViews,
      ctaClicks,
      signups,
      leads,
      actions: ctaClicks + signups + leads,
      ctaCtr: rate(ctaClicks, ctaViews, { denominatorLabel: "CTA impressions" }),
      actionRate: rate(ctaClicks + signups + leads, views, { denominatorLabel: "pageviews" }),
    };
  });

  articles.sort((a, b) => b.actions - a.actions || b.views - a.views || String(a.id).localeCompare(String(b.id)));

  const withViews = articles.filter((a) => a.views > 0);
  const withAction = articles.filter((a) => a.actions > 0);
  const publishedInWindow = articles.filter((a) => a.publishedInWindow);

  return {
    articles,
    totals: {
      articlesConsidered: articles.length,
      articlesWithViews: withViews.length,
      articlesWithAction: withAction.length,
      articlesPublishedInWindow: publishedInWindow.length,
      publishedInWindowWithAction: publishedInWindow.filter((a) => a.actions > 0).length,
      views: articles.reduce((sum, a) => sum + a.views, 0),
      ctaViews: articles.reduce((sum, a) => sum + a.ctaViews, 0),
      ctaClicks: articles.reduce((sum, a) => sum + a.ctaClicks, 0),
      signups: articles.reduce((sum, a) => sum + a.signups, 0),
      leads: articles.reduce((sum, a) => sum + a.leads, 0),
      actions: articles.reduce((sum, a) => sum + a.actions, 0),
    },
  };
}

/**
 * The single sentence the owner asked for. Says nothing flattering when there
 * is nothing to flatter, and distinguishes "no traffic" from "traffic that did
 * nothing", because those two zeros need different fixes.
 */
export function articleOutcomeVerdict(totals) {
  if (totals.articlesConsidered === 0) {
    return "No live article was published in the window and no article drew a pageview. Publishing produced nothing because nothing was measured as read.";
  }
  if (totals.views === 0) {
    return `${formatNumber(totals.articlesConsidered)} article(s) in scope drew 0 pageviews. Publishing produced no reader action because it produced no readers.`;
  }
  if (totals.actions === 0) {
    return `${formatNumber(totals.views)} pageview(s) across ${formatNumber(totals.articlesWithViews)} article(s) produced ` +
      `0 CTA clicks, 0 membership signups, and 0 leads. Publishing produced readers and zero business outcomes.`;
  }
  return `${formatNumber(totals.articlesWithAction)} of ${formatNumber(totals.articlesWithViews)} article(s) with traffic produced at least one action ` +
    `(${formatNumber(totals.ctaClicks)} CTA click(s), ${formatNumber(totals.signups)} signup(s), ${formatNumber(totals.leads)} lead(s) ` +
    `from ${formatNumber(totals.views)} pageview(s)).`;
}

/* ---------------------------------------------------------- editorial signals */

/** Data older than this many days is called out as stale rather than current. */
export const MARKET_DATA_STALE_DAYS = 45;

export function marketDataAgeDays(asOfDate, now = new Date()) {
  if (!asOfDate) return null;
  const then = new Date(`${String(asOfDate).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

/**
 * Turn the market-consistency verifier's exit into a scorecard row. The
 * verifier is the authority on correctness; this only classifies its result and
 * the age of the oldest published observation.
 */
export function summarizeMarketDataHealth({ verifierPassed, verifierSummary, oldestAsOf, newestAsOf, metricCount, now = new Date() }) {
  const oldestAgeDays = marketDataAgeDays(oldestAsOf, now);
  const stale = oldestAgeDays !== null && oldestAgeDays > MARKET_DATA_STALE_DAYS;
  return {
    verifierPassed,
    verifierSummary,
    metricCount,
    oldestAsOf: oldestAsOf ?? null,
    newestAsOf: newestAsOf ?? null,
    oldestAgeDays,
    stale,
    status: verifierPassed === false
      ? "FAIL — surfaces disagree"
      : verifierPassed === null
        ? "not checked"
        : stale
          ? `PASS but stale (oldest observation is ${oldestAgeDays} days old)`
          : "PASS",
  };
}

/* ------------------------------------------------------------ funnel rollup */

export function summarizeFunnelRow(funnel, current, prior) {
  return {
    slug: funnel.slug,
    label: funnel.label,
    path: funnel.path,
    views: trend(current.views, prior.views),
    ctaClicks: trend(current.ctaClicks, prior.ctaClicks),
    starts: trend(current.starts, prior.starts),
    submissions: trend(current.submissions, prior.submissions),
    qualified: trend(current.qualified, prior.qualified),
    qualificationRate: rate(current.qualified, current.submissions, { denominatorLabel: "submissions" }),
    medianResponseMinutes: current.medianResponseMinutes ?? null,
    valueCents: current.valueCents ?? 0,
  };
}
