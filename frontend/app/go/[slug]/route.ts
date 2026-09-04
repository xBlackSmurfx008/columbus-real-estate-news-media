import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { hostOf, looksLikeBot, recordAffiliateClickSafely } from "@/lib/affiliate-clicks";
import { loadAffiliatePrograms } from "@/lib/affiliate-programs";
import {
  isOutboundIntent,
  isPlaceholderUrl,
  outboundDestination,
  resolveAffiliateUrl,
  type AffiliateProgram,
  type OutboundIntent,
} from "@/lib/outbound-partners";

// GET /go/<key>?from=<page>&area=<area>&placement=<block>&source=<campaign>
//
// The single outbound hop for every partner link on a CREN utility page, paid
// or not (owner plan 2026-09-04, P2 item 10). It logs one `affiliate_clicks`
// row with the full dimension set — partner, page, area, intent, placement,
// destination host, and whether the link actually paid — then redirects.
//
// There is deliberately NO destination parameter. The URL is rebuilt
// server-side from the registry key, so this endpoint cannot be turned into an
// open redirect by editing a query string.
//
// Two resolution paths:
//   1. lib/outbound-partners.ts — the utility-page comparison sets.
//   2. `affiliate_partners` — the older category blocks on /resources and
//      /improve. Placeholder (example.com) rows stay unreachable, as before.
//
// Privacy matches /api/pageview and /api/funnel/event: no raw IP, no full user
// agent; visitor_hash is sha256(ip|ua|UTC date).

type LegacyPartner = { slug: string; url: string; category: string | null };

const CATEGORY_INTENT: Record<string, OutboundIntent> = {
  finance: "finance",
  "home-services": "home-services",
};

type Resolved = {
  partnerSlug: string;
  destinationKey: string | null;
  destinationUrl: string;
  intent: OutboundIntent | null;
};

async function resolveLegacyPartner(slug: string): Promise<LegacyPartner | null> {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT slug, url, category FROM affiliate_partners
      WHERE slug = ${slug} AND active = true LIMIT 1
    `;
    if (rows.length === 0) return null;
    return {
      slug: String(rows[0].slug),
      url: String(rows[0].url),
      category: rows[0].category == null ? null : String(rows[0].category),
    };
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area")?.slice(0, 120) ?? "";
    const intentParam = searchParams.get("intent");

    let resolved: Resolved | null = null;

    const destination = outboundDestination(slug);
    if (destination) {
      resolved = {
        partnerSlug: destination.partner,
        destinationKey: destination.key,
        destinationUrl: destination.url(area),
        intent: destination.intent,
      };
    } else {
      const legacy = await resolveLegacyPartner(slug);
      if (legacy && !isPlaceholderUrl(legacy.url)) {
        resolved = {
          partnerSlug: legacy.slug,
          destinationKey: null,
          destinationUrl: legacy.url,
          intent: legacy.category ? (CATEGORY_INTENT[legacy.category] ?? null) : null,
        };
      }
    }

    if (!resolved || isPlaceholderUrl(resolved.destinationUrl)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Money is looked up separately from the destination, and only ever
    // upgrades the URL. A missing or unconfigured program leaves the plain,
    // non-affiliate link exactly as the registry declared it.
    let program: AffiliateProgram | null = null;
    try {
      program = (await loadAffiliatePrograms()).get(resolved.partnerSlug) ?? null;
    } catch {
      program = null;
    }
    const affiliateUrl = resolveAffiliateUrl(program, resolved.destinationUrl);
    const finalUrl = affiliateUrl ?? resolved.destinationUrl;

    const userAgent = request.headers.get("user-agent");
    const referrer = request.headers.get("referer")?.slice(0, 300) ?? null;
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const day = new Date().toISOString().slice(0, 10);
    const visitorHash = createHash("sha256")
      .update(`${ip}|${userAgent ?? ""}|${day}`)
      .digest("hex")
      .slice(0, 24);

    // Best-effort logging — never block the redirect on it.
    await recordAffiliateClickSafely(getDb(), {
      partnerSlug: resolved.partnerSlug,
      destinationKey: resolved.destinationKey,
      page: searchParams.get("from")?.slice(0, 300) ?? null,
      area: area || null,
      intent: isOutboundIntent(intentParam) ? intentParam : resolved.intent,
      placement: searchParams.get("placement")?.slice(0, 120) ?? null,
      destinationHost: hostOf(finalUrl),
      isAffiliate: affiliateUrl !== null,
      campaignSource: searchParams.get("source")?.slice(0, 120) ?? null,
      referrer,
      referrerHost: hostOf(referrer),
      visitorHash,
      isBot: looksLikeBot(userAgent),
    });

    return NextResponse.redirect(finalUrl, 302);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
