import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { isActivationEventName, sanitizeAnalyticsPayload } from "@/lib/activation-analytics";

const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|fetch|curl|wget|python|httpclient/i;

function cleanPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.split(/[?#]/)[0].trim();
  if (!path.startsWith("/") || path.length > 300) return null;
  if (path.startsWith("/api")) return null;
  return path;
}

export async function POST(request: NextRequest) {
  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (!ua || BOT_RE.test(ua)) return new NextResponse(null, { status: 204 });

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name : "";
    if (!isActivationEventName(name)) return new NextResponse(null, { status: 204 });

    const path = cleanPath(body?.path) ?? "/";
    const payload = sanitizeAnalyticsPayload(body?.payload);
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const day = new Date().toISOString().slice(0, 10);
    const visitorHash = createHash("sha256").update(`${ip}|${ua}|${day}`).digest("hex").slice(0, 24);

    const sql = getDb();
    await sql`
      INSERT INTO activation_events (event_name, path, payload, visitor_hash)
      VALUES (${name}, ${path}, ${JSON.stringify(payload)}::jsonb, ${visitorHash})
    `;

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
