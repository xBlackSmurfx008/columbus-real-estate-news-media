#!/usr/bin/env node
// KPI report for the CMO/CSO routine and daily lead digest.
// Prints markdown: totals + deltas for the window, leads by persona/status,
// affiliate clicks by partner, and newest leads (emails masked — this output
// gets committed to the repo, keep PII out).
// Usage: DATABASE_URL=... node scripts/kpi-report.mjs [--window 7]

import { neon } from "@neondatabase/serverless";

const args = process.argv.slice(2);
const wIdx = args.indexOf("--window");
const windowDays = wIdx >= 0 ? Number(args[wIdx + 1]) || 7 : 7;

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
  const total = await sql.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  const recent = await sql.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE created_at >= NOW() - ($1 || ' days')::interval`,
    [windowDays]
  );
  return { total: total[0].n, recent: recent[0].n };
}

const [subs, members, contacts, leads] = await Promise.all([
  counts("subscribers"),
  counts("members"),
  counts("contacts"),
  counts("leads"),
]);

const leadsByPersona = await sql`
  SELECT persona, status, COUNT(*)::int AS n FROM leads
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
  ORDER BY created_at DESC LIMIT 15
`;

console.log(`## KPI snapshot — last ${windowDays} day(s)\n`);
console.log(`| Metric | Total | New in window |`);
console.log(`|---|---|---|`);
console.log(`| Subscribers | ${subs.total} | +${subs.recent} |`);
console.log(`| Members (free) | ${members.total} | +${members.recent} |`);
console.log(`| Contact messages | ${contacts.total} | +${contacts.recent} |`);
console.log(`| Leads (all personas) | ${leads.total} | +${leads.recent} |`);
console.log(`| Articles published in window | — | ${articles[0].n} |`);

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
