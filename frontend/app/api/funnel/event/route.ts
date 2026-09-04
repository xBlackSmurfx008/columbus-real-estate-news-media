import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { recordFunnelEventSafely } from "@/lib/funnel-events";
import { CLIENT_FUNNEL_STAGES } from "@/scripts/funnel-lib.mjs";

// POST: record one browser-observable funnel stage (funnel_view, cta_click,
// form_start, form_submit). Public, no auth, no cookies.
//
// Privacy matches /api/pageview: no raw IP, no full user agent. visitor_hash is
// sha256(ip|ua|UTC date), so uniques count within a day but a visitor cannot be
// followed across days.
//
// Later stages (contacted -> qualified -> opportunity -> closed) are written
// server-side from lead status transitions and are NOT accepted here.

const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|fetch|curl|wget|python|httpclient/i;
const MAX_BODY_BYTES = 8_192;

function cleanPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.split(/[?#]/)[0].trim();
  if (!path.startsWith("/") || path.length > 300) return null;
  return path;
}

export async function POST(request: NextRequest) {
  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (!ua || BOT_RE.test(ua)) return new NextResponse(null, { status: 204 });

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(raw) as Record<string, unknown>;

    const stage = typeof body.stage === "string" ? body.stage : "";
    if (!CLIENT_FUNNEL_STAGES.includes(stage as never)) {
      return new NextResponse(null, { status: 204 });
    }

    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const day = new Date().toISOString().slice(0, 10);
    const visitorHash = createHash("sha256").update(`${ip}|${ua}|${day}`).digest("hex").slice(0, 24);

    await recordFunnelEventSafely(getDb(), {
      funnel: typeof body.funnel === "string" ? body.funnel : "",
      stage,
      path: cleanPath(body.path),
      articleSlug: typeof body.articleSlug === "string" ? body.articleSlug : null,
      articleUrl: typeof body.articleUrl === "string" ? body.articleUrl : null,
      area: typeof body.area === "string" ? body.area : null,
      placement: typeof body.placement === "string" ? body.placement : null,
      campaignSource: typeof body.campaignSource === "string" ? body.campaignSource : null,
      campaignMedium: typeof body.campaignMedium === "string" ? body.campaignMedium : null,
      campaignName: typeof body.campaignName === "string" ? body.campaignName : null,
      referrerHost: typeof body.referrerHost === "string" ? body.referrerHost : null,
      visitorHash,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    // Telemetry never surfaces to the reader.
    return new NextResponse(null, { status: 204 });
  }
}
