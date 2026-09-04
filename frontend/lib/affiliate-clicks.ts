// Relative, extension-bearing imports so `node --experimental-strip-types` can
// load this module directly from tests/ and scripts/ without the `@/` alias.
import { isTestTraffic } from "../scripts/test-traffic-lib.mjs";
import { isOutboundIntent, type OutboundIntent } from "./outbound-partners.ts";

// Server-side writer for `affiliate_clicks` (owner plan 2026-09-04, P2 item 10).
//
// Same shape and same guarantees as lib/funnel-events.ts, deliberately:
//
//  1. Every click carries the full dimension set the owner asked for —
//     partner -> page -> area -> intent — plus the placement and destination,
//     so a revenue number can always be traced back to the surface that earned
//     it and to the ones that only leaked traffic.
//  2. Test traffic is classified AT WRITE TIME by the one shared predicate in
//     scripts/test-traffic-lib.mjs, so a smoke run is separable from real
//     audience by construction rather than by a filter someone remembers to
//     add later. All 8 historic rows in this table were our own test traffic;
//     that is exactly the failure this prevents repeating.
//  3. `is_affiliate` records whether the click actually went through a paying
//     link. Today it is false for every real click, because CREN has joined no
//     affiliate program. That is a fact the report should be able to show, not
//     something to paper over.
//
// The insert is written column-by-column against whatever the table actually
// has, so this file works before and after scripts/migrate-affiliate-tracking.mjs.

type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Record<string, unknown>[]>;
  query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
};

/** Why a row is excluded from real-audience reporting. Null means it counts. */
export type ClickExclusionReason = "test-source" | "bot-user-agent" | null;

export type AffiliateClickInput = {
  /** Partner identity, e.g. `zillow`. Required. */
  partnerSlug: string;
  /** Registry destination key, e.g. `zillow-buy`. */
  destinationKey?: string | null;
  /** The CREN page the reader clicked from. */
  page?: string | null;
  area?: string | null;
  intent?: OutboundIntent | string | null;
  placement?: string | null;
  /** Host actually redirected to, so leakage is measurable per destination. */
  destinationHost?: string | null;
  /** True only when the click went through a real, active affiliate link. */
  isAffiliate?: boolean;
  campaignSource?: string | null;
  referrer?: string | null;
  referrerHost?: string | null;
  visitorHash?: string | null;
  /** Set when the user agent looks automated. */
  isBot?: boolean;
};

const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|fetch|curl|wget|python|httpclient/i;

export function looksLikeBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT_RE.test(userAgent);
}

function text(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, max) : null;
}

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "").slice(0, 120);
  } catch {
    return null;
  }
}

export type NormalizedAffiliateClick = {
  partner_slug: string;
  destination_key: string | null;
  path: string | null;
  area: string | null;
  intent: string | null;
  placement: string | null;
  destination_host: string | null;
  is_affiliate: boolean;
  campaign_source: string | null;
  referrer: string | null;
  referrer_host: string | null;
  visitor_hash: string | null;
  is_test: boolean;
  exclusion_reason: ClickExclusionReason;
};

/**
 * Shape one click into the row that will be written. Exported so the exclusion
 * rule can be asserted in tests without a database.
 */
export function normalizeAffiliateClick(input: AffiliateClickInput): NormalizedAffiliateClick | null {
  const partnerSlug = text(input.partnerSlug, 120);
  if (!partnerSlug) return null;

  const campaignSource = text(input.campaignSource, 120);
  const testSource = isTestTraffic({ source: campaignSource });
  const isBot = input.isBot === true;

  return {
    partner_slug: partnerSlug,
    destination_key: text(input.destinationKey, 120),
    path: text(input.page, 300),
    area: text(input.area, 120),
    intent: isOutboundIntent(input.intent) ? input.intent : null,
    placement: text(input.placement, 120),
    destination_host: text(input.destinationHost, 120) ?? hostOf(input.destinationHost),
    is_affiliate: input.isAffiliate === true,
    campaign_source: campaignSource,
    referrer: text(input.referrer, 300),
    referrer_host: text(input.referrerHost, 120),
    visitor_hash: text(input.visitorHash, 64),
    // Excluded by construction, at write time, by the one shared predicate.
    is_test: testSource || isBot,
    exclusion_reason: testSource ? "test-source" : isBot ? "bot-user-agent" : null,
  };
}

let cachedColumns: Set<string> | null = null;

async function availableColumns(sql: SqlClient): Promise<Set<string>> {
  if (cachedColumns) return cachedColumns;
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'affiliate_clicks'`,
  );
  cachedColumns = new Set(rows.map((row) => String(row.column_name)));
  return cachedColumns;
}

/**
 * Insert one outbound click. Never throws: telemetry must not be able to break
 * a reader's redirect. Returns true when a row was written.
 */
export async function recordAffiliateClickSafely(
  sql: SqlClient,
  input: AffiliateClickInput,
): Promise<boolean> {
  const row = normalizeAffiliateClick(input);
  if (!row) return false;

  try {
    // Only write columns the table actually has, so this works before and
    // after the additive migration runs in any given environment.
    const present = await availableColumns(sql);
    const columns: string[] = [];
    const values: unknown[] = [];

    for (const [column, value] of Object.entries(row)) {
      if (!present.has(column)) continue;
      columns.push(column);
      values.push(value);
    }
    if (!columns.includes("partner_slug")) return false;

    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    await sql.query(
      `INSERT INTO affiliate_clicks (${columns.join(", ")}) VALUES (${placeholders})`,
      values,
    );
    return true;
  } catch {
    // Table not migrated yet, or a transient DB error. Silent by design.
    return false;
  }
}

/** Test hook: drop the memoized column introspection. */
export function resetAffiliateClickColumnCache(): void {
  cachedColumns = null;
}
