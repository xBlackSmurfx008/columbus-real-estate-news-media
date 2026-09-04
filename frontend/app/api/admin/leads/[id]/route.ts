import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { recordFunnelEventSafely } from "@/lib/funnel-events";
import { funnelForPersona, stageForLeadStatus, LEAD_STATUSES } from "@/scripts/funnel-lib.mjs";

const STATUSES = LEAD_STATUSES;

// PATCH: update a lead's status, notes and value.
//
// Status transitions are the back half of the funnel chain (owner plan
// 2026-09-04, P0 item 2): contacted -> qualified -> opportunity -> closed. Each
// one writes a funnel_events row joined to the lead, and the first move off
// `new` stamps first_response_at so response time is measurable rather than
// estimated.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();
    const { status, notes, valueCents } = body;

    if (status !== undefined && !STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
    }
    const cleanValueCents =
      typeof valueCents === "number" && Number.isFinite(valueCents) ? Math.trunc(valueCents) : null;

    const sql = getDb();
    const [before] = await sql`SELECT id, status, persona, area, source, is_test FROM leads WHERE id = ${Number(id)}`;
    if (!before) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const respondingNow = status !== undefined && status !== "new" && before.status === "new";

    const rows = await sql`
      UPDATE leads
      SET status = COALESCE(${status ?? null}, status),
          notes = COALESCE(${typeof notes === "string" ? notes.slice(0, 5000) : null}, notes),
          value_cents = COALESCE(${cleanValueCents}, value_cents),
          first_response_at = CASE WHEN ${respondingNow} THEN COALESCE(first_response_at, NOW()) ELSE first_response_at END,
          updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const updated = rows[0];
    const stage = status !== undefined && status !== before.status ? stageForLeadStatus(status) : null;
    const funnel = funnelForPersona(String(updated.persona));
    if (stage && funnel) {
      await recordFunnelEventSafely(sql, {
        funnel: funnel.slug,
        stage,
        path: funnel.path,
        area: typeof updated.area === "string" ? updated.area : null,
        placement: "admin-lead-queue",
        campaignSource: typeof updated.source === "string" ? updated.source : null,
        leadId: Number(updated.id),
        valueCents: typeof updated.value_cents === "number" ? updated.value_cents : null,
        isTest: updated.is_test === true,
        payload: { status, previous_status: before.status },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
