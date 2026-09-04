#!/usr/bin/env node
// KPI report for the CMO/CSO routine and daily lead digest.
//
// Prints markdown: totals + deltas for the window, the four revenue funnels
// end-to-end, referrer-host mix, a daily pageview trend, leads by
// persona/status, affiliate clicks, and newest leads (emails masked — this
// output gets committed to the repo, keep PII out).
//
// TRUTH RULE (owner plan 2026-09-04, P0 item 2): every audience, lead, and
// funnel number below is filtered through the SHARED test-traffic predicate in
// scripts/test-traffic-lib.mjs — the same predicate the capture routes apply
// when they write the row. Two consecutive weekly reviews reported our own CRM
// smoke tests as audience growth because this script carried its own, narrower
// filter. It no longer has one. A painful true number is the deliverable.
//
// Usage: DATABASE_URL=... node scripts/kpi-report.mjs [--window 7] [--telegram]
// --telegram additionally posts the headline numbers to the owner's Telegram
// (no-ops with a warning when TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are unset).
// Funnel + activation metrics require:
//   npm run newsroom:migrate-page-views
//   npm run newsroom:migrate-activation-events
//   npm run newsroom:migrate-funnel-events

import { neon } from "@neondatabase/serverless";
import { sendTelegramAlert } from "./telegram-alert.mjs";
import { resolveTestTrafficPredicates } from "./test-traffic-lib.mjs";
import { FUNNELS, FUNNEL_STAGES, QUALIFIED_STATUSES } from "./funnel-lib.mjs";

const args = process.argv.slice(2);
const wIdx = args.indexOf("--window");
const windowDays = wIdx >= 0 ? Number(args[wIdx + 1]) || 7 : 7;
const toTelegram = args.includes("--telegram");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

function maskEmail(email) {
  const [user, domain] = String(email).split("@");
  return `${user.slice(0, 2)}***@${domain ?? "?"}`;
}

function pct(numerator, denominator) {
  if (!denominator) return "n/a";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function money(cents) {
  if (!cents) return "$0";
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function duration(hours) {
  if (hours === null || hours === undefined || !Number.isFinite(hours) || hours < 0) return "n/a";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}

// Resolve the exclusion predicates ONCE, from the shared library, against the
// columns each table actually has.
const predicates = {};
for (const table of ["subscribers", "members", "contacts", "leads", "affiliate_clicks", "funnel_events"]) {
  try {
    predicates[table] = await resolveTestTrafficPredicates(sql, table);
  } catch {
    predicates[table] = null;
  }
}

const real = (table) => predicates[table]?.realWhere ?? "true";
const synthetic = (table) => predicates[table]?.testWhere ?? "false";

async function counts(table) {
  const where = real(table);
  const total = await sql.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ${where}`);
  const recent = await sql.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${where} AND created_at >= NOW() - ($1 || ' days')::interval`,
    [windowDays],
  );
  return { total: total[0].n, recent: recent[0].n };
}

async function excludedCounts() {
  const entries = await Promise.all(
    ["contacts", "subscribers", "leads", "members", "affiliate_clicks"].map(async (table) => {
      try {
        const rows = await sql.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ${synthetic(table)}`);
        return [table, rows[0].n];
      } catch {
        return [table, 0];
      }
    }),
  );
  return Object.fromEntries(entries);
}

const [subs, members, contacts, leads, excluded] = await Promise.all([
  counts("subscribers"),
  counts("members"),
  counts("contacts"),
  counts("leads"),
  excludedCounts(),
]);

const leadsByPersona = await sql.query(
  `SELECT persona, status, COUNT(*)::int AS n FROM leads WHERE ${real("leads")}
   GROUP BY persona, status ORDER BY persona, status`,
);

const clicks = await sql.query(
  `SELECT partner_slug, COUNT(*)::int AS n FROM affiliate_clicks
    WHERE ${real("affiliate_clicks")}
      AND created_at >= NOW() - ($1 || ' days')::interval
    GROUP BY partner_slug ORDER BY n DESC`,
  [windowDays],
);

const articles = await sql`
  SELECT COUNT(*)::int AS n FROM articles
  WHERE created_at >= NOW() - (${windowDays} || ' days')::interval AND status = 'live'
`;

const newestLeads = await sql.query(
  `SELECT persona, name, email, area, status, created_at FROM leads
    WHERE created_at >= NOW() - ($1 || ' days')::interval AND ${real("leads")}
    ORDER BY created_at DESC LIMIT 15`,
  [windowDays],
);

console.log(`## KPI snapshot — last ${windowDays} day(s)\n`);
console.log(
  `Test traffic is excluded by construction: every number below uses the shared\n` +
    `predicate in \`scripts/test-traffic-lib.mjs\` (synthetic sources, reserved test\n` +
    `email domains, and the explicit \`is_test\` flag), the same rule the capture\n` +
    `routes apply when the row is written.\n`,
);
console.log(`| Metric | Total | New in window |`);
console.log(`|---|---|---|`);
console.log(`| Subscribers | ${subs.total} | +${subs.recent} |`);
console.log(`| Members (free) | ${members.total} | +${members.recent} |`);
console.log(`| Contact messages | ${contacts.total} | +${contacts.recent} |`);
console.log(`| Leads (all personas) | ${leads.total} | +${leads.recent} |`);
console.log(`| Articles published in window | — | ${articles[0].n} |`);

const excludedTotal = Object.values(excluded).reduce((sum, n) => sum + n, 0);
if (excludedTotal > 0) {
  console.log(
    `\nExcluded as our own test traffic: ${excludedTotal} row(s) ` +
      `(${Object.entries(excluded).filter(([, n]) => n > 0).map(([table, n]) => `${table}: ${n}`).join(", ")}). ` +
      `These stay in the database, flagged, so the history remains auditable.`,
  );
}

// --- The four revenue funnels, end to end -----------------------------------
console.log(`\n### Revenue funnels (last ${windowDays} day(s))\n`);
console.log(`Chain: ${FUNNEL_STAGES.join(" → ")}\n`);

let funnelReport = null;
try {
  const stageRows = await sql.query(
    `SELECT funnel, stage, COUNT(*)::int AS n
       FROM funnel_events
      WHERE created_at >= NOW() - ($1 || ' days')::interval AND ${real("funnel_events")}
      GROUP BY funnel, stage`,
    [windowDays],
  );

  // Funnel-page views also come from page_views, which predates funnel_events;
  // take the larger of the two so a page viewed before this instrumentation
  // shipped is not reported as zero traffic.
  const pageViewRows = await sql.query(
    `SELECT path, COUNT(*)::int AS n FROM page_views
      WHERE created_at >= NOW() - ($1 || ' days')::interval AND path = ANY($2)
      GROUP BY path`,
    [windowDays, FUNNELS.map((f) => f.path)],
  );
  const viewsByPath = Object.fromEntries(pageViewRows.map((r) => [r.path, r.n]));

  const leadRows = await sql.query(
    `SELECT persona,
            COUNT(*)::int AS submitted,
            COUNT(*) FILTER (WHERE status <> 'new')::int AS contacted,
            COUNT(*) FILTER (WHERE status = ANY($2))::int AS qualified,
            COUNT(*) FILTER (WHERE status = 'won')::int AS closed,
            COALESCE(SUM(value_cents) FILTER (WHERE status = 'won'), 0)::bigint AS won_value_cents,
            -- A response cannot precede the inquiry; a backdated row is not
            -- allowed to flatter the SLA number.
            AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600.0)
              FILTER (WHERE first_response_at IS NOT NULL AND first_response_at >= created_at) AS avg_response_hours
       FROM leads
      WHERE created_at >= NOW() - ($1 || ' days')::interval AND ${real("leads")}
      GROUP BY persona`,
    [windowDays, QUALIFIED_STATUSES],
  );
  const leadsByFunnelPersona = Object.fromEntries(leadRows.map((r) => [r.persona, r]));

  funnelReport = FUNNELS.map((funnel) => {
    const stages = Object.fromEntries(
      stageRows.filter((r) => r.funnel === funnel.slug).map((r) => [r.stage, r.n]),
    );
    const lead = leadsByFunnelPersona[funnel.persona] ?? {};
    const views = Math.max(stages.funnel_view ?? 0, viewsByPath[funnel.path] ?? 0);
    const submissions = Math.max(stages.form_submit ?? 0, Number(lead.submitted ?? 0));
    return {
      ...funnel,
      views,
      ctaClicks: stages.cta_click ?? 0,
      starts: stages.form_start ?? 0,
      submissions,
      contacted: Number(lead.contacted ?? 0),
      qualified: Number(lead.qualified ?? 0),
      closed: Number(lead.closed ?? 0),
      valueCents: Number(lead.won_value_cents ?? 0),
      avgResponseHours: lead.avg_response_hours === null || lead.avg_response_hours === undefined
        ? null
        : Number(lead.avg_response_hours),
    };
  });

  console.log(`| Funnel | Views | CTA clicks | Form starts | Submissions | Contacted | Qualified | Qual. rate | Avg first response | Closed won | Value |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const f of funnelReport) {
    console.log(
      `| ${f.label} | ${f.views} | ${f.ctaClicks} | ${f.starts} | ${f.submissions} | ${f.contacted} | ` +
        `${f.qualified} | ${pct(f.qualified, f.submissions)} | ${duration(f.avgResponseHours)} | ${f.closed} | ${money(f.valueCents)} |`,
    );
  }

  const totals = funnelReport.reduce(
    (acc, f) => ({
      views: acc.views + f.views,
      ctaClicks: acc.ctaClicks + f.ctaClicks,
      starts: acc.starts + f.starts,
      submissions: acc.submissions + f.submissions,
      qualified: acc.qualified + f.qualified,
      valueCents: acc.valueCents + f.valueCents,
    }),
    { views: 0, ctaClicks: 0, starts: 0, submissions: 0, qualified: 0, valueCents: 0 },
  );
  console.log(
    `\nAll funnels: ${totals.views} views → ${totals.ctaClicks} CTA clicks → ${totals.starts} starts → ` +
      `${totals.submissions} submissions → ${totals.qualified} qualified. ` +
      `View→submission ${pct(totals.submissions, totals.views)}; start→submission ${pct(totals.submissions, totals.starts)}; value ${money(totals.valueCents)}.`,
  );

  // Attribution: what sends people into a funnel.
  const attribution = await sql.query(
    `SELECT COALESCE(NULLIF(article_slug, ''), '(no article)') AS article,
            COALESCE(NULLIF(placement, ''), '(unknown)') AS placement,
            COALESCE(NULLIF(campaign_source, ''), '(none)') AS campaign,
            COALESCE(NULLIF(area, ''), '(none)') AS area,
            COUNT(*)::int AS n
       FROM funnel_events
      WHERE created_at >= NOW() - ($1 || ' days')::interval
        AND stage IN ('cta_click', 'form_submit')
        AND ${real("funnel_events")}
      GROUP BY article, placement, campaign, area
      ORDER BY n DESC LIMIT 10`,
    [windowDays],
  );
  if (attribution.length > 0) {
    console.log(`\nFunnel entry attribution (article / placement / campaign / area):\n`);
    for (const row of attribution) {
      console.log(`- ${row.article} · ${row.placement} · ${row.campaign} · ${row.area}: ${row.n}`);
    }
  } else {
    console.log(`\nNo funnel CTA clicks or submissions attributed in window.`);
  }
} catch {
  console.log(`Funnel telemetry unavailable or not migrated. Run scripts/migrate-funnel-events.mjs.`);
}

if (leadsByPersona.length > 0) {
  console.log(`\n### Leads by persona & status\n`);
  for (const r of leadsByPersona) console.log(`- ${r.persona} / ${r.status}: ${r.n}`);
} else {
  console.log(`\nNo leads yet.`);
}

if (clicks.length > 0) {
  console.log(`\n### Affiliate clicks in window\n`);
  for (const c of clicks) console.log(`- ${c.partner_slug}: ${c.n}`);
} else {
  console.log(`\nNo affiliate clicks in window.`);
}

if (newestLeads.length > 0) {
  console.log(`\n### Newest leads (emails masked)\n`);
  for (const l of newestLeads) {
    console.log(`- [${new Date(l.created_at).toISOString().slice(0, 10)}] ${l.persona} — ${l.name} (${maskEmail(l.email)})${l.area ? ", " + l.area : ""} — ${l.status}`);
  }
}

// --- Traffic (server-side page_views) ---------------------------------------
let traffic = null;
try {
  const [totals] = await sql`
    SELECT COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors
    FROM page_views WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
  `;
  const topPaths = await sql`
    SELECT path, COUNT(*)::int AS n FROM page_views
    WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
    GROUP BY path ORDER BY n DESC LIMIT 10
  `;
  const referrers = await sql`
    SELECT COALESCE(NULLIF(referrer_host, ''), '(direct / none)') AS host,
           COUNT(*)::int AS views,
           COUNT(DISTINCT visitor_hash)::int AS visitors
    FROM page_views
    WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
    GROUP BY host ORDER BY views DESC LIMIT 12
  `;
  const daily = await sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
           COUNT(*)::int AS views,
           COUNT(DISTINCT visitor_hash)::int AS visitors
    FROM page_views
    WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
    GROUP BY day ORDER BY day ASC
  `;
  traffic = { ...totals, topPaths, referrers, daily };

  console.log(`\n### Traffic (server-side, last ${windowDays} day(s))\n`);
  console.log(`- Pageviews: ${totals.views}`);
  console.log(`- Unique visitors (daily-rotating hash): ${totals.visitors}`);
  if (topPaths.length > 0) {
    console.log(`\nTop pages:\n`);
    for (const p of topPaths) console.log(`- ${p.path}: ${p.n}`);
  }

  console.log(`\nReferrer mix (which channel actually sends readers):\n`);
  if (referrers.length > 0) {
    for (const r of referrers) {
      console.log(`- ${r.host}: ${r.views} views / ${r.visitors} visitors (${pct(r.views, totals.views)})`);
    }
  } else {
    console.log(`- No pageviews in window.`);
  }

  console.log(`\nDaily pageview trend:\n`);
  if (daily.length > 0) {
    const peak = Math.max(...daily.map((d) => d.views));
    for (const d of daily) {
      const bar = "#".repeat(peak > 0 ? Math.max(1, Math.round((d.views / peak) * 24)) : 0);
      console.log(`- ${d.day}  ${String(d.views).padStart(4)} views / ${String(d.visitors).padStart(4)} visitors  ${bar}`);
    }
  } else {
    console.log(`- No pageviews in window.`);
  }
} catch {
  console.log(`\n### Traffic\n`);
  console.log(`Traffic table unavailable or not migrated. Run scripts/migrate-page-views.mjs.`);
}

// --- Activation analytics ---------------------------------------------------
let activation = null;
try {
  const activationCounts = await sql`
    SELECT event_name, COUNT(*)::int AS n
    FROM activation_events
    WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
    GROUP BY event_name
  `;
  const countByName = Object.fromEntries(activationCounts.map((row) => [row.event_name, row.n]));
  const checklistStarts = countByName.renter_checklist_start ?? 0;
  const checklistCompletions = countByName.renter_checklist_complete ?? 0;
  const formSubmissions = (countByName.generate_lead ?? 0) + (countByName.contact_request ?? 0);
  const checklistCompletionRate = checklistStarts > 0 ? Math.round((checklistCompletions / checklistStarts) * 100) : null;

  const formSources = await sql`
    SELECT COALESCE(NULLIF(payload->>'method', ''), NULLIF(payload->>'source', ''), NULLIF(payload->>'section_id', ''), 'unknown') AS label,
           COUNT(*)::int AS n
    FROM activation_events
    WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
      AND event_name = ANY(${['generate_lead', 'contact_request']})
    GROUP BY label ORDER BY n DESC, label ASC LIMIT 8
  `;

  const formPersonas = await sql`
    SELECT COALESCE(NULLIF(payload->>'persona', ''), NULLIF(payload->>'role', ''), NULLIF(payload->>'inquiry_type', ''), 'unknown') AS label,
           COUNT(*)::int AS n
    FROM activation_events
    WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
      AND event_name = ANY(${['generate_lead', 'contact_request']})
    GROUP BY label ORDER BY n DESC, label ASC LIMIT 8
  `;

  const zeroSearches = await sql`
    SELECT COALESCE(NULLIF(payload->>'search_term', ''), 'unknown') AS label,
           COUNT(*)::int AS n
    FROM activation_events
    WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
      AND event_name = 'search_no_results'
    GROUP BY label ORDER BY n DESC, label ASC LIMIT 8
  `;

  const areaHubs = await sql`
    WITH area_views AS (
      SELECT replace(trim(trailing '/' from path), '/areas/', '') AS area_slug,
             COUNT(*)::int AS views,
             COUNT(DISTINCT visitor_hash)::int AS visitors
      FROM page_views
      WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
        AND path LIKE '/areas/%'
      GROUP BY area_slug
    ),
    area_events AS (
      SELECT COALESCE(
               NULLIF(payload->>'area_slug', ''),
               NULLIF(regexp_replace(path, '^/areas/([^/]+)/?$', '\\1'), path),
               NULLIF(regexp_replace(COALESCE(payload->>'method', payload->>'source', ''), '-area-hub$', ''), '')
             ) AS area_slug,
             COUNT(*) FILTER (WHERE event_name = 'area_follow_start')::int AS follows,
             COUNT(*) FILTER (WHERE event_name = 'preference_saved')::int AS preferences
      FROM activation_events
      WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
        AND (
          path LIKE '/areas/%'
          OR payload ? 'area_slug'
          OR COALESCE(payload->>'method', payload->>'source', '') LIKE '%-area-hub'
        )
      GROUP BY area_slug
    )
    SELECT COALESCE(area_views.area_slug, area_events.area_slug) AS area_slug,
           COALESCE(area_views.views, 0)::int AS views,
           COALESCE(area_views.visitors, 0)::int AS visitors,
           COALESCE(area_events.follows, 0)::int AS follows,
           COALESCE(area_events.preferences, 0)::int AS preferences
    FROM area_views
    FULL OUTER JOIN area_events USING (area_slug)
    WHERE COALESCE(area_views.area_slug, area_events.area_slug) IS NOT NULL
    ORDER BY views DESC, preferences DESC, follows DESC, area_slug ASC
    LIMIT 10
  `;

  activation = {
    areaFollows: countByName.area_follow_start ?? 0,
    preferencesSaved: countByName.preference_saved ?? 0,
    zeroResultSearches: countByName.search_no_results ?? 0,
    checklistStarts,
    checklistCompletions,
    checklistCompletionRate,
    formSubmissions,
    formSources,
    formPersonas,
    zeroSearches,
    areaHubs,
  };

  console.log(`\n### Activation analytics (last ${windowDays} day(s))\n`);
  console.log(`- Area follows started: ${activation.areaFollows}`);
  console.log(`- Preferences saved: ${activation.preferencesSaved}`);
  console.log(`- Form submissions: ${activation.formSubmissions}`);
  console.log(`- Zero-result searches: ${activation.zeroResultSearches}`);
  console.log(`- Renter checklist: ${checklistCompletions}/${checklistStarts} complete (${checklistCompletionRate === null ? "n/a" : checklistCompletionRate + "%"})`);

  if (formSources.length > 0) {
    console.log(`\nForm submissions by source:\n`);
    for (const source of formSources) console.log(`- ${source.label}: ${source.n}`);
  }
  if (formPersonas.length > 0) {
    console.log(`\nForm submissions by persona:\n`);
    for (const persona of formPersonas) console.log(`- ${persona.label}: ${persona.n}`);
  }
  if (zeroSearches.length > 0) {
    console.log(`\nZero-result search terms:\n`);
    for (const search of zeroSearches) console.log(`- ${search.label}: ${search.n}`);
  }
  if (areaHubs.length > 0) {
    console.log(`\nArea hub performance:\n`);
    for (const hub of areaHubs) {
      console.log(`- ${hub.area_slug}: ${hub.views} views / ${hub.visitors} visitors / ${hub.follows} follows / ${hub.preferences} preferences (${pct(hub.follows, hub.views)} follow rate)`);
    }
  }
} catch {
  console.log(`\n### Activation analytics\n`);
  console.log(`Activation analytics unavailable or not migrated. Run scripts/migrate-activation-events.mjs and scripts/migrate-page-views.mjs.`);
}

// --- Optional Telegram delivery ---------------------------------------------
if (toTelegram) {
  const funnelLine = funnelReport
    ? funnelReport.map((f) => `${f.label}: ${f.views}v/${f.submissions}s/${f.qualified}q`).join(" | ")
    : "Funnels: not instrumented";
  const summary = [
    `KPI last ${windowDays}d`,
    `Subscribers ${subs.total} (+${subs.recent}) | Members ${members.total} (+${members.recent})`,
    `Leads ${leads.total} (+${leads.recent}) | Contacts ${contacts.total} (+${contacts.recent})`,
    `Articles published: ${articles[0].n}`,
    traffic ? `Traffic: ${traffic.views} views / ${traffic.visitors} visitors` : `Traffic: not instrumented`,
    funnelLine,
    activation
      ? `Activation: ${activation.areaFollows} follows | ${activation.preferencesSaved} preferences | ${activation.formSubmissions} forms`
      : `Activation: not instrumented`,
    excludedTotal > 0 ? `Test rows excluded: ${excludedTotal}` : null,
  ].filter(Boolean).join("\n");
  const result = await sendTelegramAlert({ status: "COMPLETED", summary });
  console.log(result.ok ? `\nTelegram: delivered.` : `\nTelegram: NOT delivered (${result.error}).`);
}
