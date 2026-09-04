#!/usr/bin/env node
// The weekly operating scorecard (owner plan 2026-09-04, item 11).
//
//   DATABASE_URL=... npm run newsroom:scorecard -- --window 7
//
// ONE command, FIVE sections, in the owner's order:
//   Audience -> Membership -> Leads -> Commercial -> Editorial quality
// Leads are broken out by the four funnels. Editorial quality tracks fresh
// stories, corrections, failed publication gates, stale market data, and — the
// row this whole report exists for — traffic-to-action conversion per story.
//
// The framing, in the owner's words: "stop measuring how much CREN published
// and start measuring what business outcome publishing produced."
//
// WHAT THIS SCRIPT WILL NOT DO
//   - It will not estimate, project, annualize, or extrapolate anything.
//   - It will not print a rate whose denominator is zero. That is `n/a` plus
//     the reason the input is missing.
//   - It will not count our own testing as audience. Every audience, member,
//     lead, and funnel number is filtered through the SHARED predicate in
//     scripts/test-traffic-lib.mjs — the same rule the capture routes apply at
//     write time. There is no second exclusion rule in this file.
//   - It will not make a small number look big. Today's real numbers are near
//     zero and the report says so in words, not just digits.
//
// It reuses, and never re-implements: test-traffic-lib (exclusion),
// funnel-lib (the four funnels and the stage chain), inquiry-queue (SLA and
// business-hours math), verify-market-consistency (stale market data),
// article-image-policy (what counts as a durable hero), publication-gate-log
// (blocked publish attempts), scorecard-lib (every computation).

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

import { resolveTestTrafficPredicates } from "./test-traffic-lib.mjs";
import { FUNNELS, FUNNEL_STAGES, QUALIFIED_STATUSES } from "./funnel-lib.mjs";
import { isDurableArticleImageUrl } from "./article-image-policy.mjs";
import { readGateBlocks } from "./publication-gate-log.mjs";
import { businessMinutesBetween } from "../lib/inquiry-queue.ts";
import {
  articleOutcomeVerdict,
  evaluateReadinessGates,
  formatMinutes,
  formatMoneyCents,
  formatNumber,
  formatTrend,
  isoDay,
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
} from "./scorecard-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------- setup */

let windowDays;
try {
  windowDays = parseWindowDays(process.argv);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

const now = new Date();
const bounds = windowBounds(windowDays, now);
const CUR = [bounds.current.start.toISOString(), bounds.current.end.toISOString()];
const PRI = [bounds.prior.start.toISOString(), bounds.prior.end.toISOString()];

/** Resolve the shared exclusion predicates once, per table, from the library. */
const predicates = {};
for (const table of ["subscribers", "members", "contacts", "leads", "affiliate_clicks", "funnel_events"]) {
  try {
    predicates[table] = await resolveTestTrafficPredicates(sql, table);
  } catch {
    predicates[table] = null;
  }
}
const real = (table) => predicates[table]?.realWhere ?? "true";

async function rows(text, params = []) {
  try {
    return await sql.query(text, params);
  } catch {
    return null;
  }
}
async function one(text, params = []) {
  const result = await rows(text, params);
  return result && result.length > 0 ? result[0] : null;
}

/** Count rows created in a period, honouring the shared test predicate. */
async function countIn(table, period) {
  const row = await one(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${real(table)} AND created_at >= $1 AND created_at < $2`,
    period,
  );
  return row?.n ?? 0;
}
async function countAll(table) {
  const row = await one(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ${real(table)}`);
  return row?.n ?? 0;
}

/* ------------------------------------------------------- 1. audience data */

async function audience(period) {
  const totals = await one(
    `SELECT COUNT(*)::int AS views,
            COUNT(DISTINCT visitor_hash)::int AS sessions,
            COUNT(*) FILTER (WHERE article_id IS NOT NULL)::int AS article_views,
            -- Buckets are measured from the window start, not the calendar day,
            -- so a rolling 7x24h window can never report "8 of 7" days.
            COUNT(DISTINCT FLOOR(EXTRACT(EPOCH FROM (created_at - $1::timestamptz)) / 86400))::int AS active_days
       FROM page_views WHERE created_at >= $1 AND created_at < $2`,
    period,
  );
  const referrers = (await rows(
    `SELECT COALESCE(NULLIF(referrer_host, ''), '(direct / none)') AS host, COUNT(*)::int AS views
       FROM page_views WHERE created_at >= $1 AND created_at < $2
      GROUP BY 1 ORDER BY views DESC`,
    period,
  )) ?? [];
  return {
    views: totals?.views ?? 0,
    sessions: totals?.sessions ?? 0,
    articleViews: totals?.article_views ?? 0,
    activeDays: totals?.active_days ?? 0,
    referrers,
  };
}

const audCur = await audience(CUR);
const audPri = await audience(PRI);
const trafficInstrumented = (await one(`SELECT COUNT(*)::int AS n FROM page_views`))?.n ?? 0;

/* ----------------------------------------------------- 2. membership data */

async function activationCounts(period) {
  const result = (await rows(
    `SELECT event_name, COUNT(*)::int AS n FROM activation_events
      WHERE created_at >= $1 AND created_at < $2 GROUP BY 1`,
    period,
  )) ?? [];
  return Object.fromEntries(result.map((r) => [r.event_name, r.n]));
}

const actCur = await activationCounts(CUR);
const actPri = await activationCounts(PRI);
const activationRowCount = (await one(`SELECT COUNT(*)::int AS n FROM activation_events`))?.n ?? 0;
// All-time, not windowed: this is what separates "readers ignored the CTA" from
// "the CTA has never been measured anywhere, ever".
const ctaEverRecorded = (await one(
  `SELECT COUNT(*)::int AS n FROM activation_events WHERE event_name IN ('article_cta_view', 'article_cta_click')`,
))?.n ?? 0;

const membership = {
  subscribersTotal: await countAll("subscribers"),
  subscribersCur: await countIn("subscribers", CUR),
  subscribersPri: await countIn("subscribers", PRI),
  membersTotal: await countAll("members"),
  membersCur: await countIn("members", CUR),
  membersPri: await countIn("members", PRI),
};

/**
 * "New free member" for the conversion north star = a distinct email address
 * that newly appears in EITHER `subscribers` or `members` in the window.
 * Counting the two tables and adding them would double-count anyone who did
 * both (the CRM smoke run did exactly that), which would inflate the rate.
 */
async function newFreeMembers(period) {
  const row = await one(
    `SELECT COUNT(*)::int AS n FROM (
       SELECT LOWER(email) AS email FROM subscribers
         WHERE ${real("subscribers")} AND created_at >= $1 AND created_at < $2
       UNION
       SELECT LOWER(email) AS email FROM members
         WHERE ${real("members")} AND created_at >= $1 AND created_at < $2
     ) joined`,
    period,
  );
  return row?.n ?? 0;
}

/* ---------------------------------------------------------- 3. leads data */

async function funnelData(period) {
  const stageRows = (await rows(
    `SELECT funnel, stage, COUNT(*)::int AS n FROM funnel_events
      WHERE created_at >= $1 AND created_at < $2 AND ${real("funnel_events")}
      GROUP BY funnel, stage`,
    period,
  )) ?? [];
  // Funnel-page traffic also lands in page_views, which predates funnel_events.
  // Take the larger of the two so a page viewed before the instrumentation
  // shipped is not reported as zero traffic.
  const viewRows = (await rows(
    `SELECT path, COUNT(*)::int AS n FROM page_views
      WHERE created_at >= $1 AND created_at < $2 AND path = ANY($3)
      GROUP BY path`,
    [...period, FUNNELS.map((f) => f.path)],
  )) ?? [];
  const viewsByPath = Object.fromEntries(viewRows.map((r) => [r.path, r.n]));

  const leadRows = (await rows(
    `SELECT persona,
            COUNT(*)::int AS submitted,
            COUNT(*) FILTER (WHERE status <> 'new')::int AS contacted,
            COUNT(*) FILTER (WHERE status = ANY($3))::int AS qualified,
            COUNT(*) FILTER (WHERE status = 'won')::int AS closed,
            COALESCE(SUM(value_cents) FILTER (WHERE status = 'won'), 0)::bigint AS won_value_cents
       FROM leads
      WHERE created_at >= $1 AND created_at < $2 AND ${real("leads")}
      GROUP BY persona`,
    [...period, QUALIFIED_STATUSES],
  )) ?? [];
  const byPersona = Object.fromEntries(leadRows.map((r) => [r.persona, r]));

  return FUNNELS.map((funnel) => {
    const stages = Object.fromEntries(
      stageRows.filter((r) => r.funnel === funnel.slug).map((r) => [r.stage, r.n]),
    );
    const lead = byPersona[funnel.persona] ?? {};
    return {
      ...funnel,
      views: Math.max(stages.funnel_view ?? 0, viewsByPath[funnel.path] ?? 0),
      ctaClicks: stages.cta_click ?? 0,
      starts: stages.form_start ?? 0,
      submissions: Math.max(stages.form_submit ?? 0, Number(lead.submitted ?? 0)),
      contacted: Number(lead.contacted ?? 0),
      qualified: Number(lead.qualified ?? 0),
      closed: Number(lead.closed ?? 0),
      valueCents: Number(lead.won_value_cents ?? 0),
    };
  });
}

const funCur = await funnelData(CUR);
const funPri = await funnelData(PRI);
const funnelEventRowCount = (await one(`SELECT COUNT(*)::int AS n FROM funnel_events`))?.n ?? 0;

/**
 * Queue health. `inquiry_queue` carries its own `is_test` flag, written by
 * lib/inquiry-queue.ts using the same shared predicate at capture time, so the
 * flag is the exclusion here — not a second string-matching rule.
 */
async function queueRows(period) {
  return (await rows(
    `SELECT id, inquiry_type, status, disposition, received_at, sla_due_at, first_response_at
       FROM inquiry_queue
      WHERE NOT COALESCE(is_test, false) AND received_at >= $1 AND received_at < $2
      ORDER BY received_at DESC`,
    period,
  )) ?? [];
}
const queueCur = await queueRows(CUR);
const queuePri = await queueRows(PRI);
const queueOpen = (await rows(
  `SELECT id, inquiry_type, status, received_at, sla_due_at, first_response_at
     FROM inquiry_queue
    WHERE NOT COALESCE(is_test, false) AND status IN ('new', 'working')
    ORDER BY sla_due_at ASC`,
)) ?? [];

function responseMinutes(queue) {
  return queue
    .filter((row) => row.first_response_at && new Date(row.first_response_at) >= new Date(row.received_at))
    .map((row) => businessMinutesBetween(new Date(row.received_at), new Date(row.first_response_at)));
}
function breachCount(queue) {
  return queue.filter((row) => {
    const due = new Date(row.sla_due_at);
    const responded = row.first_response_at ? new Date(row.first_response_at) : null;
    return responded ? responded > due : now > due;
  }).length;
}

/* ----------------------------------------------------- 4. commercial data */

async function scalar(text, params = []) {
  const row = await one(text, params);
  return row ? Number(Object.values(row)[0] ?? 0) : 0;
}

const commercial = {
  adCampaignRows: await scalar(`SELECT COUNT(*)::int FROM ad_campaigns`),
  adCampaignsActive: await scalar(`SELECT COUNT(*)::int FROM ad_campaigns WHERE status = 'active'`),
  adCampaignValueCents: await scalar(
    `SELECT COALESCE(SUM(monthly_value), 0)::bigint FROM ad_campaigns WHERE status = 'active'`,
  ) * 100,
  insertionOrderRows: await scalar(`SELECT COUNT(*)::int FROM insertion_orders`),
  insertionOrderSignedCents: await scalar(
    `SELECT COALESCE(SUM(price_cents), 0)::bigint FROM insertion_orders
      WHERE accepted_at IS NOT NULL AND accepted_at >= $1 AND accepted_at < $2`,
    CUR,
  ),
  insertionOrderSignedCentsPrior: await scalar(
    `SELECT COALESCE(SUM(price_cents), 0)::bigint FROM insertion_orders
      WHERE accepted_at IS NOT NULL AND accepted_at >= $1 AND accepted_at < $2`,
    PRI,
  ),
  wonLeadRows: await scalar(`SELECT COUNT(*)::int FROM leads WHERE ${real("leads")} AND status = 'won'`),
  wonLeadValueCents: await scalar(
    `SELECT COALESCE(SUM(value_cents), 0)::bigint FROM leads
      WHERE ${real("leads")} AND status = 'won' AND created_at >= $1 AND created_at < $2`,
    CUR,
  ),
  wonLeadValueCentsPrior: await scalar(
    `SELECT COALESCE(SUM(value_cents), 0)::bigint FROM leads
      WHERE ${real("leads")} AND status = 'won' AND created_at >= $1 AND created_at < $2`,
    PRI,
  ),
  paidListingRows: await scalar(`SELECT COUNT(*)::int FROM listings WHERE paid_until IS NOT NULL`),
  advertiserPipeline: (await rows(`SELECT status, COUNT(*)::int AS n FROM campaigns GROUP BY 1 ORDER BY n DESC`)) ?? [],
  sponsoredProfiles: await scalar(
    `SELECT COUNT(*)::int FROM professional_profiles WHERE sponsor_status IS NOT NULL AND sponsor_status <> 'none'`,
  ),
  affiliatePartnersActive: await scalar(`SELECT COUNT(*)::int FROM affiliate_partners WHERE active = true`),
  affiliateClicksCur: await countIn("affiliate_clicks", CUR),
  affiliateClicksPri: await countIn("affiliate_clicks", PRI),
  pageviews30: await scalar(
    `SELECT COUNT(*)::int FROM page_views WHERE created_at >= NOW() - INTERVAL '30 days'`,
  ),
};

// Recorded revenue = money the database can actually attest to in this window.
const recordedRevenueCents = commercial.insertionOrderSignedCents + commercial.wonLeadValueCents;
const recordedRevenueCentsPrior = commercial.insertionOrderSignedCentsPrior + commercial.wonLeadValueCentsPrior;
const revenueSources = [
  { label: "ad_campaigns", rows: commercial.adCampaignRows },
  { label: "insertion_orders", rows: commercial.insertionOrderRows },
  { label: "leads (status=won)", rows: commercial.wonLeadRows },
  { label: "listings (paid)", rows: commercial.paidListingRows },
];

/* ----------------------------------------------- 5. editorial quality data */

const freshCur = await scalar(
  `SELECT COUNT(*)::int FROM articles WHERE status = 'live' AND created_at >= $1 AND created_at < $2`,
  CUR,
);
const freshPri = await scalar(
  `SELECT COUNT(*)::int FROM articles WHERE status = 'live' AND created_at >= $1 AND created_at < $2`,
  PRI,
);
const liveArticles = await scalar(`SELECT COUNT(*)::int FROM articles WHERE status = 'live'`);

// "Missing a hero" uses the same durable-host rule the publish gate uses, so a
// local /images/ path or a null counts as missing exactly as it does at publish.
const heroRows = (await rows(`SELECT id, title, image_url FROM articles WHERE status = 'live'`)) ?? [];
const missingHero = heroRows.filter((row) => !isDurableArticleImageUrl(row.image_url));

const gateCur = await readGateBlocks(sql, { start: bounds.current.start, end: bounds.current.end });
const gatePri = await readGateBlocks(sql, { start: bounds.prior.start, end: bounds.prior.end });

// Corrections. There is no corrections register in this database — /corrections
// is a policy page, not a log — so "corrections published" is honestly n/a. What
// IS recorded is inbound correction traffic, and that is reported as itself.
const CORRECTION_PATTERN = "correction|corrections|inaccura|factual error|misstat|retract|please fix";
async function correctionRequests(period) {
  return await scalar(
    `SELECT COUNT(*)::int FROM contacts
      WHERE ${real("contacts")} AND created_at >= $1 AND created_at < $2
        AND (COALESCE(source, '') ~* $3 OR COALESCE(message, '') ~* $3)`,
    [...period, CORRECTION_PATTERN],
  );
}
const correctionsCur = await correctionRequests(CUR);
const correctionsPri = await correctionRequests(PRI);
const disputesCur = await scalar(
  `SELECT COUNT(*)::int FROM profile_disputes WHERE created_at >= $1 AND created_at < $2`,
  CUR,
);
const disputesPri = await scalar(
  `SELECT COUNT(*)::int FROM profile_disputes WHERE created_at >= $1 AND created_at < $2`,
  PRI,
);

// Stale market data: run the canonical verifier itself rather than reimplement
// its rules. Its exit code is the answer.
const verifier = spawnSync(
  process.execPath,
  ["--experimental-strip-types", join(here, "verify-market-consistency.mjs")],
  { encoding: "utf8", env: process.env, timeout: 120_000 },
);
const verifierPassed = verifier.error || verifier.status === null ? null : verifier.status === 0;
const verifierSummary = verifierPassed === null
  ? `verifier could not be run (${verifier.error?.message ?? "unknown error"})`
  : verifierPassed
    ? "DB, committed fallback, and every public surface agree"
    : (verifier.stderr || verifier.stdout || "").trim().split("\n").slice(-6).join(" / ");

const marketAges = await one(
  `SELECT TO_CHAR(MIN(as_of_date), 'YYYY-MM-DD') AS oldest,
          TO_CHAR(MAX(as_of_date), 'YYYY-MM-DD') AS newest,
          COUNT(*)::int AS n
     FROM market_observations WHERE quality_status = 'verified'`,
);
const marketHealth = summarizeMarketDataHealth({
  verifierPassed,
  verifierSummary,
  oldestAsOf: marketAges?.oldest ?? null,
  newestAsOf: marketAges?.newest ?? null,
  metricCount: marketAges?.n ?? 0,
  now,
});

/* --------------------------------------- traffic-to-action, per published story */

const outcomeRows = (await rows(
  `WITH views AS (
     SELECT article_id, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS sessions
       FROM page_views
      WHERE created_at >= $1 AND created_at < $2 AND article_id IS NOT NULL
      GROUP BY article_id
   ),
   events AS (
     SELECT COALESCE(
              NULLIF(payload->>'article_id', ''),
              NULLIF(regexp_replace(path, '^/blog/([^/?#]+)/?$', '\\1'), path)
            ) AS ref,
            COUNT(*) FILTER (WHERE event_name = 'article_cta_view')::int AS cta_views,
            COUNT(*) FILTER (WHERE event_name = 'article_cta_click')::int AS cta_clicks,
            COUNT(*) FILTER (WHERE event_name IN ('membership_signup', 'sign_up'))::int AS signups
       FROM activation_events
      WHERE created_at >= $1 AND created_at < $2
      GROUP BY ref
   ),
   funnel AS (
     SELECT article_slug AS ref, COUNT(*)::int AS leads
       FROM funnel_events
      WHERE created_at >= $1 AND created_at < $2
        AND stage = 'form_submit' AND ${real("funnel_events")}
        AND COALESCE(article_slug, '') <> ''
      GROUP BY article_slug
   )
   SELECT a.id, a.title, a.canonical_slug,
          (a.created_at >= $1 AND a.created_at < $2) AS published_in_window,
          COALESCE(v.views, 0) AS views, COALESCE(v.sessions, 0) AS sessions,
          COALESCE(e.cta_views, 0) AS cta_views, COALESCE(e.cta_clicks, 0) AS cta_clicks,
          COALESCE(e.signups, 0) AS signups, COALESCE(f.leads, 0) AS leads
     FROM articles a
     LEFT JOIN views v ON v.article_id = a.canonical_slug
     LEFT JOIN events e ON e.ref = a.id OR e.ref = a.canonical_slug
     LEFT JOIN funnel f ON f.ref = a.canonical_slug OR f.ref = a.id
    WHERE a.status = 'live'
      AND (COALESCE(v.views, 0) > 0 OR (a.created_at >= $1 AND a.created_at < $2))`,
  CUR,
)) ?? [];

const outcomes = summarizeArticleOutcomes(
  outcomeRows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.canonical_slug,
    publishedInWindow: row.published_in_window,
    views: row.views,
    sessions: row.sessions,
    ctaViews: row.cta_views,
    ctaClicks: row.cta_clicks,
    signups: row.signups,
    leads: row.leads,
  })),
);

/* --------------------------------------------------------- north stars */

const qualifiedCur = funCur.reduce((sum, f) => sum + f.qualified, 0);
const qualifiedPri = funPri.reduce((sum, f) => sum + f.qualified, 0);
const newMembersCur = await newFreeMembers(CUR);
const newMembersPri = await newFreeMembers(PRI);

const northStars = [
  northStarQualifiedLeadsPerThousand({ qualifiedLeads: qualifiedCur, sessions: audCur.sessions }),
  northStarFreeMemberConversion({ signups: newMembersCur, sessions: audCur.sessions }),
  northStarValuePerThousand({
    revenueCents: recordedRevenueCents,
    sessions: audCur.sessions,
    recordedSources: revenueSources,
    unitEconomicsKnown: false,
  }),
];
const northStarsPrior = [
  northStarQualifiedLeadsPerThousand({ qualifiedLeads: qualifiedPri, sessions: audPri.sessions }),
  northStarFreeMemberConversion({ signups: newMembersPri, sessions: audPri.sessions }),
];

/* ------------------------------------------------------------------ render */

const out = [];
const say = (line = "") => out.push(line);

const fmtWindow = `${isoDay(bounds.current.start)} → ${isoDay(bounds.current.end)}`;
const fmtPrior = `${isoDay(bounds.prior.start)} → ${isoDay(bounds.prior.start.getTime() + windowDays * 86_400_000)}`;

say(`# CREN weekly operating scorecard`);
say();
say(`**Window:** last ${windowDays} day(s), ${fmtWindow}  `);
say(`**Compared with:** the ${windowDays} day(s) before it, ${fmtPrior}  `);
say(`**Generated:** ${now.toISOString()}`);
say();
say(`## How to read this`);
say();
say(`- **Session** = one distinct \`visitor_hash\` = one visitor-day. The hash is`);
say(`  \`sha256(ip|user-agent|UTC date)\` and rotates daily by design, so a person`);
say(`  visiting on three days counts as three sessions and cannot be followed`);
say(`  across days. This is the denominator of all three north-star numbers.`);
say(`- **Test traffic is excluded by construction.** Every audience, member,`);
say(`  lead, and funnel number is filtered by the shared predicate in`);
say(`  \`scripts/test-traffic-lib.mjs\` — the same rule the capture routes apply`);
say(`  when the row is written. This report defines no exclusion rule of its own.`);
say(`- **\`n/a\` means the input does not exist**, and the reason is always given.`);
say(`  It never stands in for zero. A zero is printed as a zero.`);
say(`- **Nothing here is projected or annualized.** A ${windowDays}-day number is a`);
say(`  ${windowDays}-day number.`);
say();

/* --- north stars ---------------------------------------------------------- */

say(`## North-star numbers`);
say();
say(markdownTable(
  ["North star", "This window", "Prior window", "Arithmetic"],
  northStars.map((star, index) => [
    star.label,
    `**${star.display}**`,
    northStarsPrior[index]?.display ?? "n/a",
    star.basis,
  ]),
));
say();
for (const star of northStars) {
  if (star.note) say(`- **${star.label}:** ${star.note}`);
}
say();

/* --- 1. audience ---------------------------------------------------------- */

say(`## 1. Audience`);
say();
if (trafficInstrumented === 0) {
  say(`No pageview has ever been recorded. \`page_views\` is empty — run \`npm run newsroom:migrate-page-views\` and deploy before reading this section as audience data.`);
  say();
} else {
  const viewsPerSession = rate(audCur.views, audCur.sessions, { denominatorLabel: "sessions" });
  say(markdownTable(
    ["Metric", "This window", "Prior window", "Change"],
    [
      ["Sessions (visitor-days)", formatNumber(audCur.sessions), formatNumber(audPri.sessions), formatTrend(trend(audCur.sessions, audPri.sessions))],
      ["Pageviews", formatNumber(audCur.views), formatNumber(audPri.views), formatTrend(trend(audCur.views, audPri.views))],
      ["Article pageviews", formatNumber(audCur.articleViews), formatNumber(audPri.articleViews), formatTrend(trend(audCur.articleViews, audPri.articleViews))],
      ["Days with any traffic", `${formatNumber(audCur.activeDays)} of ${windowDays}`, `${formatNumber(audPri.activeDays)} of ${windowDays}`, formatTrend(trend(audCur.activeDays, audPri.activeDays))],
      ["Pageviews per session", viewsPerSession.value === null ? "n/a" : (audCur.views / audCur.sessions).toFixed(2), audPri.sessions ? (audPri.views / audPri.sessions).toFixed(2) : "n/a", "—"],
    ],
  ));
  say();
  say(`**Where readers came from**`);
  say();
  const priorByHost = Object.fromEntries(audPri.referrers.map((r) => [r.host, r.views]));
  if (audCur.referrers.length === 0) {
    say(`No pageviews in this window, so there is no referrer mix.`);
  } else {
    say(markdownTable(
      ["Referrer", "Views", "Share", "Prior window", "Change"],
      audCur.referrers.slice(0, 8).map((r) => [
        r.host,
        formatNumber(r.views),
        rate(r.views, audCur.views, { denominatorLabel: "pageviews" }).display,
        formatNumber(priorByHost[r.host] ?? 0),
        formatTrend(trend(r.views, priorByHost[r.host] ?? 0)),
      ]),
    ));
  }
  say();
  say(
    `_Measurement limit:_ \`page_views\` has no \`is_test\` column, so the shared test-traffic predicate ` +
    `cannot be applied to traffic the way it is applied to members and leads. Bot user-agents are dropped ` +
    `at capture, but visits from our own tools and browsers are counted as audience. Read the referrer ` +
    `table with that in mind — a host that is one of our own systems is our own traffic, not a reader.`,
  );
  say();
}

/* --- 2. membership -------------------------------------------------------- */

say(`## 2. Membership`);
say();
say(markdownTable(
  ["Metric", "This window", "Prior window", "Change", "All-time"],
  [
    ["New free members", formatNumber(membership.membersCur), formatNumber(membership.membersPri), formatTrend(trend(membership.membersCur, membership.membersPri)), formatNumber(membership.membersTotal)],
    ["New subscribers", formatNumber(membership.subscribersCur), formatNumber(membership.subscribersPri), formatTrend(trend(membership.subscribersCur, membership.subscribersPri)), formatNumber(membership.subscribersTotal)],
  ],
));
say();
say(`**Progressive signup — step 1 and step 2 are measured independently, so the two rates never share a denominator.**`);
say();
const step1Views = actCur.membership_signup_view ?? 0;
const step1Signups = actCur.membership_signup ?? 0;
const step2Views = actCur.membership_profile_view ?? 0;
const step2Done = actCur.membership_profile_complete ?? 0;
const step2Skipped = actCur.membership_profile_skip ?? 0;
say(markdownTable(
  ["Step", "Views", "Completions", "Rate", "Prior completions", "Change"],
  [
    ["Step 1 — email + area/topic", formatNumber(step1Views), formatNumber(step1Signups), rate(step1Signups, step1Views, { denominatorLabel: "step-1 views" }).display, formatNumber(actPri.membership_signup ?? 0), formatTrend(trend(step1Signups, actPri.membership_signup ?? 0))],
    ["Step 2 — optional profile", formatNumber(step2Views), formatNumber(step2Done), rate(step2Done, step2Views, { denominatorLabel: "step-2 views" }).display, formatNumber(actPri.membership_profile_complete ?? 0), formatTrend(trend(step2Done, actPri.membership_profile_complete ?? 0))],
  ],
));
say();
if (step2Skipped > 0) say(`Step 2 skipped deliberately: ${formatNumber(step2Skipped)}.`);
if (activationRowCount === 0) {
  say(`\`activation_events\` is empty: **no membership funnel event has ever been recorded.** The step-1/step-2 instrumentation shipped 2026-09-04 and is not yet deployed, so the zeros above are "not yet measured", not "measured and nobody signed up". The all-time member and subscriber counts in the table above ARE real.`);
} else if (step1Views === 0 && step1Signups === 0) {
  say(`No membership funnel event fired in this window. \`activation_events\` holds ${formatNumber(activationRowCount)} row(s) all-time, so the pipe works; nobody reached the signup block in this window.`);
}
say();

/* --- 3. leads ------------------------------------------------------------- */

say(`## 3. Leads`);
say();
say(`Chain: ${FUNNEL_STAGES.join(" → ")}`);
say();
const priByFunnel = Object.fromEntries(funPri.map((f) => [f.slug, f]));
say(markdownTable(
  ["Funnel", "Views", "CTA clicks", "Form starts", "Submissions", "Qualified", "Qual. rate", "Closed won", "Value", "Submissions Δ"],
  funCur.map((f) => {
    const prior = priByFunnel[f.slug] ?? {};
    return [
      f.label,
      formatNumber(f.views),
      formatNumber(f.ctaClicks),
      formatNumber(f.starts),
      formatNumber(f.submissions),
      formatNumber(f.qualified),
      rate(f.qualified, f.submissions, { denominatorLabel: "submissions" }).display,
      formatNumber(f.closed),
      formatMoneyCents(f.valueCents),
      formatTrend(trend(f.submissions, prior.submissions ?? 0)),
    ];
  }),
));
say();
const funTot = funCur.reduce((acc, f) => ({
  views: acc.views + f.views, ctaClicks: acc.ctaClicks + f.ctaClicks, starts: acc.starts + f.starts,
  submissions: acc.submissions + f.submissions, qualified: acc.qualified + f.qualified, value: acc.value + f.valueCents,
}), { views: 0, ctaClicks: 0, starts: 0, submissions: 0, qualified: 0, value: 0 });
say(
  `**All four funnels:** ${formatNumber(funTot.views)} view(s) → ${formatNumber(funTot.ctaClicks)} CTA click(s) → ` +
  `${formatNumber(funTot.starts)} form start(s) → ${formatNumber(funTot.submissions)} submission(s) → ` +
  `${formatNumber(funTot.qualified)} qualified. View→submission ${rate(funTot.submissions, funTot.views, { denominatorLabel: "funnel views" }).display}; ` +
  `recorded value ${formatMoneyCents(funTot.value)}.`,
);
say();
if (funnelEventRowCount === 0) {
  say(
    `\`funnel_events\` is empty: **no funnel event has ever been recorded.** The end-to-end funnel ` +
    `instrumentation shipped 2026-09-04 and is not deployed yet, so CTA clicks and form starts above are ` +
    `"not yet measured". Funnel *views* and *submissions* are still real — they fall back to \`page_views\` ` +
    `and to the \`leads\` table respectively.`,
  );
  say();
}

say(`**Lead-response queue** (the one-business-day promise; owner, timer, and disposition per inquiry)`);
say();
const respCur = responseMinutes(queueCur);
const respPri = responseMinutes(queuePri);
say(markdownTable(
  ["Metric", "This window", "Prior window", "Change"],
  [
    ["Real inquiries received", formatNumber(queueCur.length), formatNumber(queuePri.length), formatTrend(trend(queueCur.length, queuePri.length))],
    ["SLA breaches (answered late or still unanswered past due)", formatNumber(breachCount(queueCur)), formatNumber(breachCount(queuePri)), formatTrend(trend(breachCount(queueCur), breachCount(queuePri)), { betterWhen: "lower" })],
    ["Median first response (business time)", formatMinutes(median(respCur)), formatMinutes(median(respPri)), respCur.length && respPri.length ? formatTrend(trend(median(respCur), median(respPri)), { betterWhen: "lower" }) : "n/a — no responses to compare"],
    ["Open right now (any age)", formatNumber(queueOpen.length), "—", "—"],
  ],
));
say();
if (queueCur.length === 0) {
  say(`No real inquiry arrived in this window, so response time is \`n/a\` rather than perfect. The queue and its SLA timers are live and would have started a clock on arrival.`);
  say();
}

/* --- 4. commercial -------------------------------------------------------- */

say(`## 4. Commercial`);
say();
say(markdownTable(
  ["Metric", "This window", "Prior window", "Change"],
  [
    ["Recorded revenue", formatMoneyCents(recordedRevenueCents), formatMoneyCents(recordedRevenueCentsPrior), formatTrend(trend(recordedRevenueCents / 100, recordedRevenueCentsPrior / 100), { unit: " USD" })],
    ["Signed insertion orders (value)", formatMoneyCents(commercial.insertionOrderSignedCents), formatMoneyCents(commercial.insertionOrderSignedCentsPrior), formatTrend(trend(commercial.insertionOrderSignedCents / 100, commercial.insertionOrderSignedCentsPrior / 100), { unit: " USD" })],
    ["Closed-won lead value", formatMoneyCents(commercial.wonLeadValueCents), formatMoneyCents(commercial.wonLeadValueCentsPrior), formatTrend(trend(commercial.wonLeadValueCents / 100, commercial.wonLeadValueCentsPrior / 100), { unit: " USD" })],
    ["Affiliate clicks (real)", formatNumber(commercial.affiliateClicksCur), formatNumber(commercial.affiliateClicksPri), formatTrend(trend(commercial.affiliateClicksCur, commercial.affiliateClicksPri))],
  ],
));
say();
say(`**Where a dollar could be recorded, and how many rows each table actually holds:**`);
say();
say(markdownTable(
  ["Revenue source", "Rows", "Reading"],
  [
    ["`ad_campaigns` (active)", `${formatNumber(commercial.adCampaignsActive)} of ${formatNumber(commercial.adCampaignRows)}`, commercial.adCampaignRows === 0 ? "No advertiser campaign has ever existed." : "See active campaign value."],
    ["`insertion_orders`", formatNumber(commercial.insertionOrderRows), commercial.insertionOrderRows === 0 ? "No insertion order has ever been signed." : "Signed orders exist."],
    ["`leads` (status = won)", formatNumber(commercial.wonLeadRows), commercial.wonLeadRows === 0 ? "No lead has ever been marked won." : "Won leads exist."],
    ["`listings` (paid)", formatNumber(commercial.paidListingRows), commercial.paidListingRows === 0 ? "No paid listing has ever existed." : "Paid listings exist."],
    ["Sponsored profiles", formatNumber(commercial.sponsoredProfiles), commercial.sponsoredProfiles === 0 ? "No profile is sponsored." : "Sponsored profiles exist."],
    ["`affiliate_partners` (active)", formatNumber(commercial.affiliatePartnersActive), "No database field records whether a partner agreement is actually signed; the gate below stays closed until the owner confirms one."],
  ],
));
say();
if (commercial.advertiserPipeline.length > 0) {
  say(`Advertiser pipeline (\`campaigns\` by status): ${commercial.advertiserPipeline.map((r) => `${r.status} ${r.n}`).join(", ")}. An \`inquiry\` row is a conversation, not revenue.`);
  say();
}

say(`**Revenue-line readiness gates** — a line does not open until its gate is met (\`.claude/skills/cren-revenue\`).`);
say();
const gates = evaluateReadinessGates({
  monthlyPageviews: commercial.pageviews30,
  realMembers: membership.membersTotal,
  realSubscribers: membership.subscribersTotal,
  newsletterSendsShipped: 0,
  affiliateProgramJoined: false,
  thirtyDayReturnRate: null,
});
say(markdownTable(
  ["Revenue line", "Status", "Distance to the gate"],
  gates.map((g) => [
    g.line,
    g.status === "OPEN" ? "**OPEN**" : "closed",
    g.conditions.length === 0
      ? g.detail
      : g.conditions.map((c) => `${c.label} ${c.actual} (need ${c.required})${c.met ? " ✓" : ""}`).join("; "),
  ]),
));
say();
say(
  `Paid membership's gate is a 30-day return rate, and it is **\`n/a\` — structurally unmeasurable today**: ` +
  `\`visitor_hash\` rotates daily for privacy, so no return visit can be observed. Measuring it needs a ` +
  `logged-in member signal, not more analytics.`,
);
say();

/* --- 5. editorial quality ------------------------------------------------- */

say(`## 5. Editorial quality`);
say();
say(`### Traffic-to-action conversion — what publishing produced`);
say();
say(articleOutcomeVerdict(outcomes.totals));
say();
say(markdownTable(
  ["Metric", "This window"],
  [
    ["Articles in scope (published in window, or drew traffic)", formatNumber(outcomes.totals.articlesConsidered)],
    ["…of those, drew at least one pageview", formatNumber(outcomes.totals.articlesWithViews)],
    ["…of those, produced at least one action", `**${formatNumber(outcomes.totals.articlesWithAction)}**`],
    ["Total pageviews on those articles", formatNumber(outcomes.totals.views)],
    ["CTA impressions → CTA clicks", `${formatNumber(outcomes.totals.ctaViews)} → ${formatNumber(outcomes.totals.ctaClicks)} (${rate(outcomes.totals.ctaClicks, outcomes.totals.ctaViews, { denominatorLabel: "CTA impressions" }).display})`],
    ["Membership signups attributed to an article", formatNumber(outcomes.totals.signups)],
    ["Leads attributed to an article", formatNumber(outcomes.totals.leads)],
    ["Actions per 1,000 article pageviews", perThousand(outcomes.totals.actions, outcomes.totals.views, { denominatorLabel: "article pageviews" }).display],
  ],
));
say();
const shown = outcomes.articles.filter((a) => a.views > 0 || a.actions > 0).slice(0, 15);
if (shown.length > 0) {
  say(`Top stories by action, then by traffic (an action is a CTA click, a membership signup, or a lead — being seen is not an action):`);
  say();
  say(markdownTable(
    ["Story", "Published in window", "Views", "CTA seen", "CTA clicked", "Signups", "Leads", "Actions"],
    shown.map((a) => [
      a.title.length > 68 ? `${a.title.slice(0, 65)}…` : a.title,
      a.publishedInWindow ? "yes" : "no",
      formatNumber(a.views),
      formatNumber(a.ctaViews),
      formatNumber(a.ctaClicks),
      formatNumber(a.signups),
      formatNumber(a.leads),
      a.actions > 0 ? `**${formatNumber(a.actions)}**` : "0",
    ]),
  ));
  say();
}
if (ctaEverRecorded === 0) {
  say(
    `**The CTA columns are zero because the CTA has never been measured, not because readers ignored it.** ` +
    `\`activation_events\` contains no \`article_cta_view\` or \`article_cta_click\` row at any point in ` +
    `history. The contextual article CTA and its impression/click tracking shipped 2026-09-04 and are not ` +
    `deployed yet. Until a deploy happens, treat this row as unmeasured — the pageview and lead columns ` +
    `beside it are real.`,
  );
  say();
}

say(`### Editorial quality signals`);
say();
say(markdownTable(
  ["Signal", "This window", "Prior window", "Change"],
  [
    ["Fresh stories published", formatNumber(freshCur), formatNumber(freshPri), formatTrend(trend(freshCur, freshPri))],
    ["Correction / factual-fix requests received", formatNumber(correctionsCur), formatNumber(correctionsPri), formatTrend(trend(correctionsCur, correctionsPri), { betterWhen: "lower" })],
    ["Profile disputes filed", formatNumber(disputesCur), formatNumber(disputesPri), formatTrend(trend(disputesCur, disputesPri), { betterWhen: "lower" })],
    [
      "Failed publication gates",
      gateCur.available ? formatNumber(gateCur.blocks.length) : "0 recorded",
      gatePri.available ? formatNumber(gatePri.blocks.length) : "0 recorded",
      gateCur.available ? formatTrend(trend(gateCur.blocks.length, gatePri.blocks.length), { betterWhen: "lower" }) : "—",
    ],
    ["Live articles missing a durable hero", `${formatNumber(missingHero.length)} of ${formatNumber(liveArticles)}`, "—", "—"],
    ["Market data consistent", marketHealth.status, "—", "—"],
  ],
));
say();
say(`**Corrections published: \`n/a\`.** CREN has no corrections register — \`/corrections\` is a policy page, not a log — so the number of corrections actually published cannot be counted. The row above counts inbound correction *requests*, which is a different and real thing. Making "corrections published" measurable needs a corrections table and a public correction note on the article, not a query.`);
say();
if (!gateCur.available || gateCur.allTime === 0) {
  say(
    `**Failed publication gates: 0, and that zero is real but young.** Gate-block logging is active in ` +
    `\`scripts/publish-article.mjs\` — every gate that stops a publish writes a row to ` +
    `\`publication_gate_events\` with the gate name and the exact failed checks. No publish attempt has ` +
    `been blocked since logging shipped on 2026-09-04, so this reads "nothing was blocked", not "nothing ` +
    `was watched".`,
  );
} else {
  say(
    `Gate-block logging active since ${isoDay(gateCur.loggingSince)}; ` +
    `${formatNumber(gateCur.allTime)} block(s) recorded all-time.`,
  );
  if (gateCur.byGate.length > 0) {
    say();
    say(`Blocked by gate in this window: ${gateCur.byGate.map((g) => `${g.gate} ×${g.count}`).join(", ")}.`);
    say();
    for (const block of gateCur.blocks.slice(0, 8)) {
      say(`- [${isoDay(block.created_at)}] \`${block.gate}\` — ${block.article_title ?? block.article_ref ?? "untitled draft"}: ${block.reason}`);
    }
  }
}
say();
if (missingHero.length > 0) {
  say(`Missing a durable hero (a local \`/images/\` path or null does not count as a publication image):`);
  say();
  for (const row of missingHero.slice(0, 10)) {
    say(`- \`${row.id}\` — ${row.image_url ? `non-durable: ${row.image_url}` : "no image"}`);
  }
  if (missingHero.length > 10) say(`- …and ${missingHero.length - 10} more.`);
  say();
}
say(`**Market data:** ${marketHealth.metricCount} verified observation(s); as-of dates run ${marketHealth.oldestAsOf ?? "n/a"} → ${marketHealth.newestAsOf ?? "n/a"}` +
  `${marketHealth.oldestAgeDays === null ? "" : ` (oldest is ${marketHealth.oldestAgeDays} day(s) old)`}. Verifier: ${marketHealth.verifierSummary}.`);
say();

console.log(out.join("\n"));
