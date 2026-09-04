import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { listQueue, loadOwners, type QueueRow } from "@/lib/inquiry-queue-db";
import { slaSnapshot } from "@/lib/inquiry-queue";

export const dynamic = "force-dynamic";

type SqlArg = Parameters<typeof listQueue>[0];

/**
 * Admin-only. This endpoint returns lead PII (name, email, phone), so it is
 * gated by requireAuth() before any query runs.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const sql = getDb() as unknown as SqlArg;
    const { searchParams } = new URL(request.url);
    const includeTest = searchParams.get("includeTest") === "1";

    const rows = await listQueue(sql, {
      includeTest,
      status: searchParams.get("status"),
      inquiryType: searchParams.get("inquiryType"),
      ownerKey: searchParams.get("ownerKey"),
      limit: Number(searchParams.get("limit")) || 300,
    });

    const owners = await loadOwners(sql);

    const alerts = await sql`
      SELECT id, alert_key, kind, queue_id, message, delivery, delivery_error, created_at
      FROM inquiry_alerts
      WHERE acknowledged_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `;

    // SLA statistics deliberately exclude is_test rows so smoke records can
    // never move a real number.
    const stats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE first_response_at IS NULL AND status IN ('new','working'))::int AS open_count,
        COUNT(*) FILTER (WHERE first_response_at IS NULL AND status IN ('new','working') AND sla_due_at <= NOW())::int AS breached_count,
        COUNT(*) FILTER (WHERE first_response_at IS NULL AND status IN ('new','working') AND sla_due_at > NOW() AND sla_warn_at <= NOW())::int AS due_soon_count,
        COUNT(*) FILTER (WHERE first_response_at IS NOT NULL)::int AS responded_count,
        COUNT(*) FILTER (WHERE first_response_at IS NOT NULL AND first_response_at <= sla_due_at)::int AS responded_in_sla_count,
        COUNT(*)::int AS total_count
      FROM inquiry_queue
      WHERE is_test = false
    `;

    const now = new Date();
    const decorated = (rows as QueueRow[]).map((row) => ({ ...row, sla: slaSnapshot(row, now) }));

    return NextResponse.json({
      rows: decorated,
      owners,
      alerts,
      stats: stats[0] ?? {},
      serverTime: now.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
