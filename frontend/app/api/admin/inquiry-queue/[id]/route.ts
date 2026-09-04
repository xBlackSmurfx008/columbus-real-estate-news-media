import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logQueueEvent, loadOwners } from "@/lib/inquiry-queue-db";
import {
  DISPOSITIONS,
  QUEUE_STATUSES,
  RESPONSE_CHANNELS,
  type Disposition,
  type QueueStatus,
  type ResponseChannel,
} from "@/lib/inquiry-queue";

export const dynamic = "force-dynamic";

type SqlArg = Parameters<typeof loadOwners>[0];

function clean(value: unknown, max = 1_000): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

/**
 * Admin-only queue mutations: reassign owner, record the first response,
 * set a disposition, or add a note. Every change is written to
 * inquiry_queue_events with the acting admin's email.
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const queueId = Number(id);
  if (!Number.isInteger(queueId) || queueId <= 0) {
    return NextResponse.json({ error: "Invalid queue id." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const sql = getDb() as unknown as SqlArg;
    const actor = String(auth.email ?? "admin");

    const existing = await sql`SELECT * FROM inquiry_queue WHERE id = ${queueId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
    }
    const before = existing[0];
    const changes: string[] = [];

    // --- owner reassignment (never allowed to clear the owner) -------------
    const ownerKey = clean(body.ownerKey, 80);
    if (ownerKey) {
      const owners = await loadOwners(sql);
      if (!owners.some((owner) => owner.owner_key === ownerKey)) {
        return NextResponse.json({ error: "Unknown owner." }, { status: 400 });
      }
      await sql`UPDATE inquiry_queue SET owner_key = ${ownerKey}, updated_at = NOW() WHERE id = ${queueId}`;
      await logQueueEvent(sql, queueId, "reassigned", actor, { from: before.owner_key, to: ownerKey });
      changes.push("owner");
    }

    // --- first response ----------------------------------------------------
    if (body.recordFirstResponse === true) {
      const channel = RESPONSE_CHANNELS.includes(body.channel as ResponseChannel)
        ? (body.channel as ResponseChannel)
        : "other";
      const note = clean(body.responseNote, 2_000);
      // first_response_at is written once; a later "responded" click does not
      // rewrite history and quietly improve the SLA record.
      await sql`
        UPDATE inquiry_queue
        SET first_response_at = COALESCE(first_response_at, NOW()),
            first_response_channel = COALESCE(first_response_channel, ${channel}),
            first_response_by = COALESCE(first_response_by, ${actor}),
            status = CASE WHEN status IN ('new','working') THEN 'responded' ELSE status END,
            notes = CASE WHEN ${note}::text IS NULL THEN notes
                         ELSE COALESCE(notes || E'\n', '') || ${note} END,
            updated_at = NOW()
        WHERE id = ${queueId}
      `;
      await logQueueEvent(sql, queueId, "first_response_recorded", actor, { channel, note });
      changes.push("first_response");
    }

    // --- status ------------------------------------------------------------
    const status = clean(body.status, 40);
    if (status) {
      if (!QUEUE_STATUSES.includes(status as QueueStatus)) {
        return NextResponse.json({ error: "Unknown status." }, { status: 400 });
      }
      await sql`UPDATE inquiry_queue SET status = ${status}, updated_at = NOW() WHERE id = ${queueId}`;
      await logQueueEvent(sql, queueId, "status_changed", actor, { from: before.status, to: status });
      changes.push("status");
    }

    // --- disposition -------------------------------------------------------
    const disposition = clean(body.disposition, 40);
    if (disposition) {
      if (!DISPOSITIONS.includes(disposition as Disposition)) {
        return NextResponse.json({ error: "Unknown disposition." }, { status: 400 });
      }
      const note = clean(body.dispositionNote, 2_000);
      await sql`
        UPDATE inquiry_queue
        SET disposition = ${disposition},
            disposition_note = COALESCE(${note}, disposition_note),
            disposition_at = NOW(),
            status = CASE WHEN ${disposition} = 'pending' THEN status ELSE 'closed' END,
            is_test = CASE WHEN ${disposition} = 'test_record' THEN true ELSE is_test END,
            updated_at = NOW()
        WHERE id = ${queueId}
      `;
      await logQueueEvent(sql, queueId, "disposition_set", actor, { from: before.disposition, to: disposition, note });
      changes.push("disposition");
    }

    // --- free-form note ----------------------------------------------------
    const note = clean(body.note, 2_000);
    if (note) {
      await sql`
        UPDATE inquiry_queue
        SET notes = COALESCE(notes || E'\n', '') || ${note}, updated_at = NOW()
        WHERE id = ${queueId}
      `;
      await logQueueEvent(sql, queueId, "note_added", actor, { note });
      changes.push("note");
    }

    // --- alert acknowledgement --------------------------------------------
    if (body.acknowledgeAlerts === true) {
      await sql`
        UPDATE inquiry_alerts SET acknowledged_at = NOW()
        WHERE queue_id = ${queueId} AND acknowledged_at IS NULL
      `;
      await logQueueEvent(sql, queueId, "alerts_acknowledged", actor, {});
      changes.push("alerts");
    }

    if (changes.length === 0) {
      return NextResponse.json({ error: "No supported field to update." }, { status: 400 });
    }

    const updated = await sql`SELECT * FROM inquiry_queue WHERE id = ${queueId}`;
    return NextResponse.json({ ok: true, changed: changes, row: updated[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Admin-only audit trail for one inquiry. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const queueId = Number(id);
  if (!Number.isInteger(queueId) || queueId <= 0) {
    return NextResponse.json({ error: "Invalid queue id." }, { status: 400 });
  }

  try {
    const sql = getDb() as unknown as SqlArg;
    const rows = await sql`SELECT * FROM inquiry_queue WHERE id = ${queueId}`;
    if (rows.length === 0) return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
    const events = await sql`
      SELECT action, actor, detail, created_at
      FROM inquiry_queue_events
      WHERE queue_id = ${queueId}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ row: rows[0], events });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
