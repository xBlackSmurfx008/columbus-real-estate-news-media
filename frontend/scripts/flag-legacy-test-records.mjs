#!/usr/bin/env node
// One-off: flag the historical test rows the shared predicate cannot see.
//
// `affiliate_clicks` carries no source or email column, so the canonical
// predicate has nothing to key on. The 2026-09-04 audit established that all
// eight all-time rows are automated verification traffic — every one on
// /resources, several in identical-second pairs, with the site itself as the
// referrer and no matching pageview session. They are flagged here by explicit
// id, with the rows printed first, rather than silently deleted.
//
// Any row NOT in the list below stays untouched. Re-running is safe.
//
//   node scripts/flag-legacy-test-records.mjs                        # dry run
//   node scripts/flag-legacy-test-records.mjs --confirm=test-traffic # write

import { neon } from "@neondatabase/serverless";

// id -> the evidence for calling it ours. Keep the reason with the row.
const AFFILIATE_CLICK_EVIDENCE = {
  1: "2026-07-08 /resources — pre-launch partner-link verification, no session",
  2: "2026-07-08 /resources — pre-launch partner-link verification, no session",
  3: "2026-08-27 02:05:36 /resources — identical-second pair with id 4",
  4: "2026-08-27 02:05:36 /resources — identical-second pair with id 3",
  5: "2026-08-27 02:10:04 /resources — self-referred automated pair with id 6",
  6: "2026-08-27 02:10:05 /resources — self-referred automated pair with id 5",
  7: "2026-08-27 05:34:42 /resources — overnight automated run, no session",
  8: "2026-08-27 13:20:47 /resources — self-referred automated run, no session",
};

const write = process.argv.includes("--confirm=test-traffic");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

const ids = Object.keys(AFFILIATE_CLICK_EVIDENCE).map(Number);
const rows = await sql`SELECT * FROM affiliate_clicks WHERE id = ANY(${ids}) ORDER BY id`;

console.log(`affiliate_clicks rows matched by the audit list (${rows.length}):`);
for (const row of rows) {
  console.log(`  #${row.id} ${row.partner_slug} ${row.path} ${new Date(row.created_at).toISOString()} — ${AFFILIATE_CLICK_EVIDENCE[row.id]}`);
}

if (!write) {
  console.log(`\nDry run. Re-run with --confirm=test-traffic to set is_test = true on these rows.`);
  process.exit(0);
}

const flagged = await sql`
  UPDATE affiliate_clicks SET is_test = true
  WHERE id = ANY(${ids}) AND COALESCE(is_test, false) = false
  RETURNING id
`;
console.log(`\nFlagged ${flagged.length} affiliate_clicks row(s) as test traffic (rows kept, history auditable).`);
