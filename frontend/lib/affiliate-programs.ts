import { getDb } from "@/lib/db";
import {
  AFFILIATE_PROGRAM_STATUSES,
  type AffiliateProgram,
  type AffiliateProgramStatus,
} from "@/lib/outbound-partners";

// Reads the `affiliate_programs` table: the ONE place a real affiliate
// relationship is recorded (owner plan 2026-09-04, P2 item 10).
//
// The table ships seeded with one `status = 'unconfigured'` row per registry
// partner and no IDs, which is the truthful starting state — CREN has joined no
// affiliate program. Dropping in a real relationship later is a data change,
// not a code change: set program_name, partner_id, tracking_url_template and
// flip status to 'active'. See docs/AFFILIATE_PROGRAMS.md.

function status(value: unknown): AffiliateProgramStatus {
  return (AFFILIATE_PROGRAM_STATUSES as readonly string[]).includes(String(value))
    ? (value as AffiliateProgramStatus)
    : "unconfigured";
}

function nullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Every configured program, keyed by partner slug.
 *
 * Returns an EMPTY map when the table is missing or the database is
 * unreachable. That failure mode is deliberate and is the safe one: with no
 * program config, every link renders as a plain outbound link with no
 * disclosure and no sponsored rel. A database outage can never cause CREN to
 * claim a paid relationship it does not have.
 */
export async function loadAffiliatePrograms(): Promise<Map<string, AffiliateProgram>> {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT partner_slug, program_name, partner_id, tracking_url_template, status, notes
      FROM affiliate_programs
    `;
    return new Map(
      rows.map((row) => {
        const program: AffiliateProgram = {
          partner_slug: String(row.partner_slug),
          program_name: nullableText(row.program_name),
          partner_id: nullableText(row.partner_id),
          tracking_url_template: nullableText(row.tracking_url_template),
          status: status(row.status),
          notes: nullableText(row.notes),
        };
        return [program.partner_slug, program];
      }),
    );
  } catch {
    return new Map();
  }
}
