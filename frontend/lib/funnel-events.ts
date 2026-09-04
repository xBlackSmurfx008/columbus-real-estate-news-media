import { isTestTraffic } from "@/scripts/test-traffic-lib.mjs";
import { isFunnelSlug, isFunnelStage, type FunnelSlug, type FunnelStage } from "@/scripts/funnel-lib.mjs";

// Server-side writer for `funnel_events` (owner plan 2026-09-04, P0 item 2).
//
// Two rules this module exists to enforce:
//  1. Every event carries its attribution — originating article URL, area,
//     CTA placement, campaign source — so a funnel number can always be
//     traced back to what produced it.
//  2. Test traffic is classified AT WRITE TIME by the shared predicate, so a
//     smoke run is separable from real audience without the report having to
//     re-derive anything.

type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Record<string, unknown>[]>;
};

export type FunnelEventInput = {
  funnel: string;
  stage: string;
  path?: string | null;
  articleSlug?: string | null;
  articleUrl?: string | null;
  area?: string | null;
  placement?: string | null;
  campaignSource?: string | null;
  campaignMedium?: string | null;
  campaignName?: string | null;
  referrerHost?: string | null;
  visitorHash?: string | null;
  leadId?: number | null;
  valueCents?: number | null;
  /** Explicitly force the synthetic flag (e.g. a known smoke email). */
  isTest?: boolean;
  payload?: Record<string, unknown> | null;
};

function text(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, max) : null;
}

function integer(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

/** Article slug from an on-site path or absolute URL, else null. */
export function articleSlugFromPath(value: unknown): string | null {
  const raw = text(value, 500);
  if (!raw) return null;
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      path = new URL(raw).pathname;
    } catch {
      return null;
    }
  }
  const match = path.split(/[?#]/)[0].match(/^\/blog\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).slice(0, 200);
  } catch {
    return match[1].slice(0, 200);
  }
}

export function normalizeFunnelEvent(input: FunnelEventInput): (FunnelEventInput & {
  funnel: FunnelSlug;
  stage: FunnelStage;
  isTest: boolean;
}) | null {
  if (!isFunnelSlug(input.funnel) || !isFunnelStage(input.stage)) return null;

  const campaignSource = text(input.campaignSource, 120);
  const articleUrl = text(input.articleUrl, 500);

  return {
    funnel: input.funnel,
    stage: input.stage,
    path: text(input.path, 300),
    articleSlug: text(input.articleSlug, 200) ?? articleSlugFromPath(articleUrl),
    articleUrl,
    area: text(input.area, 120),
    placement: text(input.placement, 120),
    campaignSource,
    campaignMedium: text(input.campaignMedium, 120),
    campaignName: text(input.campaignName, 120),
    referrerHost: text(input.referrerHost, 120),
    visitorHash: text(input.visitorHash, 64),
    leadId: integer(input.leadId),
    valueCents: integer(input.valueCents),
    // Classified by the one shared predicate — same rule the KPI report uses.
    isTest: input.isTest === true || isTestTraffic({ source: campaignSource }),
    payload: input.payload && typeof input.payload === "object" ? input.payload : {},
  };
}

/**
 * Insert one funnel event. Never throws: telemetry must not be able to break a
 * reader's page or a lead submission. Returns true when a row was written.
 */
export async function recordFunnelEventSafely(sql: SqlClient, input: FunnelEventInput): Promise<boolean> {
  const event = normalizeFunnelEvent(input);
  if (!event) return false;

  try {
    await sql`
      INSERT INTO funnel_events (
        funnel, stage, path, article_slug, article_url, area, placement,
        campaign_source, campaign_medium, campaign_name, referrer_host,
        visitor_hash, lead_id, value_cents, is_test, payload
      ) VALUES (
        ${event.funnel}, ${event.stage}, ${event.path}, ${event.articleSlug}, ${event.articleUrl},
        ${event.area}, ${event.placement}, ${event.campaignSource}, ${event.campaignMedium},
        ${event.campaignName}, ${event.referrerHost}, ${event.visitorHash}, ${event.leadId},
        ${event.valueCents}, ${event.isTest}, ${JSON.stringify(event.payload ?? {})}::jsonb
      )
    `;
    return true;
  } catch {
    // Table not migrated yet, or a transient DB error. Silent by design.
    return false;
  }
}
