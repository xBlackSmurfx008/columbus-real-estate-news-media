import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";

// POST: record one pageview, server-side (public, no auth).
// Privacy rules (CMO directive 2026-08-17 P1): no cookies, no raw IP, no full
// user agent stored. visitor_hash = sha256(ip|ua|UTC date) so uniques can be
// counted within a day but visitors cannot be tracked across days.

const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|fetch|curl|wget|python|httpclient/i;

function refHost(referrer: unknown, ownHost: string): string | null {
  if (typeof referrer !== "string" || !referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return host && host !== ownHost ? host.slice(0, 120) : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (!ua || BOT_RE.test(ua)) return new NextResponse(null, { status: 204 });

    const body = await request.json().catch(() => ({}));
    let path = typeof body?.path === "string" ? body.path : "";
    path = path.split(/[?#]/)[0].trim();
    if (!path.startsWith("/") || path.length > 300) {
      return new NextResponse(null, { status: 204 });
    }
    if (path.startsWith("/admin") || path.startsWith("/api")) {
      return new NextResponse(null, { status: 204 });
    }

    const articleId = path.startsWith("/blog/")
      ? decodeURIComponent(path.slice("/blog/".length)).split("/")[0].slice(0, 200) || null
      : null;

    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const day = new Date().toISOString().slice(0, 10);
    const visitorHash = createHash("sha256").update(`${ip}|${ua}|${day}`).digest("hex").slice(0, 24);

    const sql = getDb();
    await sql`
      INSERT INTO page_views (path, article_id, referrer_host, visitor_hash)
      VALUES (${path}, ${articleId}, ${refHost(body?.referrer, request.nextUrl.hostname)}, ${visitorHash})
    `;
    return new NextResponse(null, { status: 204 });
  } catch {
    // Analytics must never break a page; swallow everything.
    return new NextResponse(null, { status: 204 });
  }
}
