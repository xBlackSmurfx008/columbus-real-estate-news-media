#!/usr/bin/env node
// KPI report for the CMO/CSO routine and daily lead digest.
// Prints markdown: totals + deltas for the window, leads by persona/status,
// affiliate clicks by partner, and newest leads (emails masked — this output
// gets committed to the repo, keep PII out).
// Usage: DATABASE_URL=... node scripts/kpi-report.mjs [--window 7] [--telegram]
// --telegram additionally posts the headline numbers to the owner's Telegram
// (no-ops with a warning when TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are unset).
// Activation metrics require the Vercel production DATABASE_URL plus:
//   npm run newsroom:migrate-activation-events
//   npm run newsroom:migrate-page-views
// Add the command to Vercel Cron only after those tables exist in production.

import { neon } from "@neondatabase/serverless";
import { sendTelegramAlert } from "./telegram-alert.mjs";
import { nonSmokeWhere, smokeCountQuery } from "./smoke-records-lib.mjs";

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

async function counts(table) {
  const where = nonSmokeWhere(table);
  const total = await sql.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ${where}`);
  const recent = await sql.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${where} AND created_at >= NOW() - ($1 || ' days')::interval`,
    [windowDays]
  );
  return { total: total[0].n, recent: recent[0].n };
}

async function smokeCounts() {
  const entries = await Promise.all(
    ["contacts", "subscribers", "leads", "members"].map(async (table) => {
      const rows = await sql.query(smokeCountQuery(table));
      return [table, rows[0].n];
    })
  );
  return Object.fromEntries(entries);
}

const [subs, members, contacts, leads, smoke] = await Promise.all([
  counts("subscribers"),
  counts("members"),
  counts("contacts"),
  counts("leads"),
  smokeCounts(),
]);

const leadsByPersona = await sql`
  SELECT persona, status, COUNT(*)::int AS n FROM leads
  WHERE COALESCE(source, '') NOT LIKE 'codex-smoke:%'
    AND COALESCE(email, '') NOT LIKE 'codex.smoke+%@example.com'
  GROUP BY persona, status ORDER BY persona, status
`;

const clicks = await sql`
  SELECT partner_slug, COUNT(*)::int AS n FROM affiliate_clicks
  WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
  GROUP BY partner_slug ORDER BY n DESC
`;

const articles = await sql`
  SELECT COUNT(*)::int AS n FROM articles
  WHERE created_at >= NOW() - (${windowDays} || ' days')::interval AND status = 'live'
`;

const newestLeads = await sql`
  SELECT persona, name, email, area, status, created_at FROM leads
  WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
    AND COALESCE(source, '') NOT LIKE 'codex-smoke:%'
    AND COALESCE(email, '') NOT LIKE 'codex.smoke+%@example.com'
  ORDER BY created_at DESC LIMIT 15
`;

console.log(`## KPI snapshot — last ${windowDays} day(s)\n`);
console.log(`Controlled codex-smoke records are excluded from audience and lead totals.\n`);
console.log(`| Metric | Total | New in window |`);
console.log(`|---|---|---|`);
console.log(`| Subscribers | ${subs.total} | +${subs.recent} |`);
console.log(`| Members (free) | ${members.total} | +${members.recent} |`);
console.log(`| Contact messages | ${contacts.total} | +${contacts.recent} |`);
console.log(`| Leads (all personas) | ${leads.total} | +${leads.recent} |`);
console.log(`| Articles published in window | — | ${articles[0].n} |`);

const smokeTotal = Object.values(smoke).reduce((sum, n) => sum + n, 0);
if (smokeTotal > 0) {
  console.log(`\nControlled smoke records currently stored but excluded: ${smokeTotal} (${Object.entries(smoke).map(([table, n]) => `${table}: ${n}`).join(", ")}).`);
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

// --- Traffic (server-side page_views; CMO directive 2026-08-17 P1) ----------
const FUNNEL_PAGES = [
  ["/sell/your-home", "FSBO seller"],
  ["/sell/investment-property", "Investor sale"],
  ["/invest/deploy-capital", "Capital partner"],
  ["/rent/find-a-home", "Renter"],
];

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
  const funnelRows = await sql`
    SELECT path, COUNT(*)::int AS n FROM page_views
    WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
      AND path = ANY(${FUNNEL_PAGES.map(([p]) => p)})
    GROUP BY path
  `;
  const funnelViews = Object.fromEntries(funnelRows.map((r) => [r.path, r.n]));
  const funnelTotal = funnelRows.reduce((sum, r) => sum + r.n, 0);
  traffic = { ...totals, topPaths, funnelViews, funnelTotal };

  console.log(`\n### Traffic (server-side, last ${windowDays} day(s))\n`);
  console.log(`- Pageviews: ${totals.views}`);
  console.log(`- Unique visitors (daily-rotating hash): ${totals.visitors}`);
  if (topPaths.length > 0) {
    console.log(`\nTop pages:\n`);
    for (const p of topPaths) console.log(`- ${p.path}: ${p.n}`);
  }
  console.log(`\nFunnel pages:\n`);
  for (const [path, label] of FUNNEL_PAGES) {
    console.log(`- ${label} (${path}): ${funnelViews[path] ?? 0}`);
  }
  const rate = funnelTotal > 0 ? ((leads.recent / funnelTotal) * 100).toFixed(1) + "%" : "n/a (no funnel views)";
  console.log(`\nView-to-lead rate (leads in window / funnel-page views): ${rate}`);
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
    GROUP BY label
    ORDER BY n DESC, label ASC
    LIMIT 8
  `;

  const formPersonas = await sql`
    SELECT COALESCE(NULLIF(payload->>'persona', ''), NULLIF(payload->>'role', ''), NULLIF(payload->>'inquiry_type', ''), 'unknown') AS label,
           COUNT(*)::int AS n
    FROM activation_events
    WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
      AND event_name = ANY(${['generate_lead', 'contact_request']})
    GROUP BY label
    ORDER BY n DESC, label ASC
    LIMIT 8
  `;

  const zeroSearches = await sql`
    SELECT COALESCE(NULLIF(payload->>'search_term', ''), 'unknown') AS label,
           COUNT(*)::int AS n
    FROM activation_events
    WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
      AND event_name = 'search_no_results'
    GROUP BY label
    ORDER BY n DESC, label ASC
    LIMIT 8
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
      const followRate = hub.views > 0 ? ((hub.follows / hub.views) * 100).toFixed(1) + "%" : "n/a";
      console.log(`- ${hub.area_slug}: ${hub.views} views / ${hub.visitors} visitors / ${hub.follows} follows / ${hub.preferences} preferences (${followRate} follow rate)`);
    }
  }
} catch {
  console.log(`\n### Activation analytics\n`);
  console.log(`Activation analytics unavailable or not migrated. Run scripts/migrate-activation-events.mjs and scripts/migrate-page-views.mjs.`);
}

// --- Optional Telegram delivery ---------------------------------------------
if (toTelegram) {
  const summary = [
    `KPI last ${windowDays}d`,
    `Subscribers ${subs.total} (+${subs.recent}) | Members ${members.total} (+${members.recent})`,
    `Leads ${leads.total} (+${leads.recent}) | Contacts ${contacts.total} (+${contacts.recent})`,
    `Articles published: ${articles[0].n}`,
    traffic
      ? `Traffic: ${traffic.views} views / ${traffic.visitors} visitors; funnel views ${traffic.funnelTotal}`
      : `Traffic: not instrumented`,
    activation
      ? `Activation: ${activation.areaFollows} follows | ${activation.preferencesSaved} preferences | ${activation.formSubmissions} forms | ${activation.zeroResultSearches} zero searches`
      : `Activation: not instrumented`,
    smokeTotal > 0 ? `Smoke records excluded: ${smokeTotal}` : null,
  ].filter(Boolean).join("\n");
  const result = await sendTelegramAlert({ status: "COMPLETED", summary });
  console.log(result.ok ? `\nTelegram: delivered.` : `\nTelegram: NOT delivered (${result.error}).`);
}
