import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  ACTIVATION_EVENT_DEFINITIONS,
  sanitizeAnalyticsPayload,
  summarizeActivationEvents,
  type StoredAreaPageView,
  type StoredActivationEvent,
} from "@/lib/activation-analytics";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const sql = getDb();
    const eventNames = ACTIVATION_EVENT_DEFINITIONS.map((event) => event.name);
    const [rows, areaPageViewRows] = await Promise.all([
      sql`
        SELECT event_name, path, payload, created_at
        FROM activation_events
        WHERE event_name = ANY(${eventNames})
          AND created_at >= NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT 1000
      `,
      sql`
        SELECT path, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors
        FROM page_views
        WHERE created_at >= NOW() - INTERVAL '30 days'
          AND path LIKE '/areas/%'
        GROUP BY path
        ORDER BY views DESC
        LIMIT 200
      `,
    ]);
    const events: StoredActivationEvent[] = rows.map((row) => ({
      name: String(row.event_name),
      path: typeof row.path === "string" ? row.path : "/",
      payload: sanitizeAnalyticsPayload(row.payload),
      timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    }));
    const areaPageViews: StoredAreaPageView[] = areaPageViewRows.map((row) => ({
      path: typeof row.path === "string" ? row.path : "/",
      views: Number(row.views) || 0,
      visitors: Number(row.visitors) || 0,
    }));

    return NextResponse.json({ windowDays: 30, events, areaPageViews, summary: summarizeActivationEvents(events, areaPageViews) });
  } catch {
    // Fail closed without exposing database hosts, credentials, or migration state.
    return NextResponse.json({ error: "ACTIVATION_ANALYTICS_UNAVAILABLE" }, { status: 503 });
  }
}
