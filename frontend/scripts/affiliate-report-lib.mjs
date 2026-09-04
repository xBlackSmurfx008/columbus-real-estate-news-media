// Per-partner outbound and affiliate performance (owner plan 2026-09-04,
// P2 item 10, reporting half).
//
// This is a LIBRARY, not a report. `scripts/kpi-report.mjs` and the weekly
// scorecard are owned elsewhere; they can import `affiliatePerformance()` and
// `formatAffiliateReport()` and render the numbers however they like without
// this file ever touching their code.
//
// Exclusion uses `scripts/test-traffic-lib.mjs` — the same predicate capture
// uses at write time and the same one kpi-report.mjs already applies to every
// other table. All 8 historic affiliate_clicks rows are our own test traffic
// and every one of them is excluded here by that shared rule.
//
// Two numbers matter and are reported separately:
//   clicks           readers we sent to a partner (measured leakage)
//   affiliate_clicks readers we sent through a link that actually pays
// Today the second is 0 by construction, because CREN has joined no affiliate
// program. That gap is the point of the report.

import { resolveTestTrafficPredicates } from "./test-traffic-lib.mjs";

// Every dimension except partner_slug/path is added by
// scripts/migrate-affiliate-tracking.mjs, so each grouping checks for its own
// column and is simply omitted where the migration has not run yet.
function has(columns, column) {
  return columns.includes(column);
}

/** `COUNT(*) FILTER` for paid clicks, or a constant 0 pre-migration. */
function affiliateCountExpr(columns) {
  return has(columns, "is_affiliate")
    ? "COUNT(*) FILTER (WHERE is_affiliate)::int"
    : "0::int";
}

async function groupBy(sql, { column, where, windowDays, columns, limit = 50 }) {
  if (!has(columns, column)) return [];
  const rows = await sql.query(
    `SELECT COALESCE(${column}, '(none)') AS key,
            COUNT(*)::int AS clicks,
            ${affiliateCountExpr(columns)} AS affiliate_clicks
       FROM affiliate_clicks
      WHERE ${where}
        AND created_at >= NOW() - ($1 || ' days')::interval
      GROUP BY 1
      ORDER BY clicks DESC, key ASC
      LIMIT ${limit}`,
    [windowDays],
  );
  return rows.map((row) => ({
    key: String(row.key),
    clicks: Number(row.clicks),
    affiliateClicks: Number(row.affiliate_clicks),
  }));
}

/**
 * Outbound click performance for a window.
 *
 * Returns `{ available: false, reason }` rather than throwing when the table is
 * missing, so a caller's report degrades to a note instead of an error.
 */
export async function affiliatePerformance(sql, { windowDays = 30 } = {}) {
  let predicates;
  try {
    predicates = await resolveTestTrafficPredicates(sql, "affiliate_clicks");
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : String(error) };
  }

  const { columns, realWhere, testWhere } = predicates;
  if (columns.length === 0) {
    return { available: false, reason: "affiliate_clicks table not found" };
  }

  const [totals] = await sql.query(
    `SELECT COUNT(*)::int AS clicks,
            ${affiliateCountExpr(columns)} AS affiliate_clicks
       FROM affiliate_clicks
      WHERE ${realWhere}
        AND created_at >= NOW() - ($1 || ' days')::interval`,
    [windowDays],
  );

  const [allTime] = await sql.query(
    `SELECT COUNT(*)::int AS clicks FROM affiliate_clicks WHERE ${realWhere}`,
  );

  const [excluded] = await sql.query(
    `SELECT COUNT(*)::int AS n FROM affiliate_clicks WHERE ${testWhere}`,
  );

  const [byPartner, byPage, byArea, byIntent, byPlacement] = await Promise.all([
    groupBy(sql, { column: "partner_slug", where: realWhere, windowDays, columns }),
    groupBy(sql, { column: "path", where: realWhere, windowDays, columns }),
    groupBy(sql, { column: "area", where: realWhere, windowDays, columns }),
    groupBy(sql, { column: "intent", where: realWhere, windowDays, columns }),
    groupBy(sql, { column: "placement", where: realWhere, windowDays, columns }),
  ]);

  return {
    available: true,
    windowDays,
    columns,
    totals: {
      clicks: Number(totals.clicks),
      affiliateClicks: Number(totals.affiliate_clicks),
      allTimeClicks: Number(allTime.clicks),
      excludedTestClicks: Number(excluded.n),
    },
    byPartner,
    byPage,
    byArea,
    byIntent,
    byPlacement,
  };
}

/**
 * Which partners can actually earn today. This is the honest answer to
 * "why is affiliate revenue zero": every row here is `unconfigured` until the
 * owner joins a real program and pastes a real ID in.
 */
export async function affiliateProgramStatus(sql) {
  try {
    const rows = await sql`
      SELECT partner_slug, program_name, network, partner_id,
             tracking_url_template, status, notes
      FROM affiliate_programs
      ORDER BY partner_slug
    `;
    return rows.map((row) => ({
      partnerSlug: String(row.partner_slug),
      programName: row.program_name ? String(row.program_name) : null,
      network: row.network ? String(row.network) : null,
      status: String(row.status),
      // Never echo the ID itself into a report; only whether one exists.
      hasPartnerId: Boolean(row.partner_id && String(row.partner_id).trim()),
      hasTrackingTemplate: Boolean(
        row.tracking_url_template && String(row.tracking_url_template).trim(),
      ),
      notes: row.notes ? String(row.notes) : null,
    }));
  } catch {
    return [];
  }
}

function table(rows, label) {
  if (rows.length === 0) return "";
  const lines = [`\n### By ${label}\n`, `| ${label} | Clicks | Paid clicks |`, "| --- | ---: | ---: |"];
  for (const row of rows) {
    lines.push(`| ${row.key} | ${row.clicks} | ${row.affiliateClicks} |`);
  }
  return lines.join("\n");
}

/** Markdown a KPI report or scorecard can paste straight in. */
export function formatAffiliateReport(result, programs = []) {
  if (!result?.available) {
    return `## Affiliate / outbound clicks\n\nNot available: ${result?.reason ?? "unknown"}.`;
  }

  const { totals, windowDays } = result;
  const lines = [
    `## Affiliate / outbound clicks — last ${windowDays} day(s)\n`,
    `- Real outbound clicks: **${totals.clicks}** (all time: ${totals.allTimeClicks})`,
    `- Of those, through a paying affiliate link: **${totals.affiliateClicks}**`,
    `- Excluded as test traffic: ${totals.excludedTestClicks}`,
  ];

  if (totals.clicks > 0 && totals.affiliateClicks === 0) {
    lines.push(
      `- Every one of those clicks left unmonetized: no affiliate program is active.`,
    );
  }

  const active = programs.filter((program) => program.status === "active");
  if (programs.length > 0) {
    lines.push(
      `\n### Program status\n`,
      `| Partner | Program | Status | ID on file |`,
      `| --- | --- | --- | --- |`,
      ...programs.map(
        (program) =>
          `| ${program.partnerSlug} | ${program.programName ?? "—"} | ${program.status} | ${program.hasPartnerId ? "yes" : "no"} |`,
      ),
    );
    if (active.length === 0) {
      lines.push(
        `\nNo affiliate program is active, so affiliate revenue is $0 by construction.`,
        `Joining a program is a business step, not a code change: see docs/AFFILIATE_PROGRAMS.md.`,
      );
    }
  }

  for (const [rows, label] of [
    [result.byPartner, "partner"],
    [result.byPage, "page"],
    [result.byArea, "area"],
    [result.byIntent, "intent"],
    [result.byPlacement, "placement"],
  ]) {
    const rendered = table(rows, label);
    if (rendered) lines.push(rendered);
  }

  return lines.join("\n");
}
