import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendEmail, emailConfigured } from "@/lib/email";
import { recordFunnelEventSafely } from "@/lib/funnel-events";
import { funnelForPersona, stageForLeadStatus } from "@/scripts/funnel-lib.mjs";

// POST: reply to a lead by email through Resend, then record the response.
//
// The status transition happens only AFTER Resend accepts the message, so
// `contacted` and `first_response_at` can never claim a response that was
// not actually delivered to the provider. A failed send changes nothing.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    if (!emailConfigured()) {
      return NextResponse.json(
        { error: "Email is not configured. Set RESEND_API_KEY (and verify the sending domain in Resend) to reply from the queue." },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 300) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 20_000) : "";
    if (!subject || !message) {
      return NextResponse.json({ error: "Both subject and message are required." }, { status: 400 });
    }

    const sql = getDb();
    const [lead] = await sql`
      SELECT id, name, email, persona, area, source, status, is_test, value_cents
      FROM leads WHERE id = ${Number(id)}
    `;
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const delivery = await sendEmail({ to: String(lead.email), subject, text: message });
    if (!delivery.ok) {
      return NextResponse.json(
        { error: `Email not sent (${delivery.error}${delivery.detail ? `: ${delivery.detail}` : ""}). Lead unchanged.` },
        { status: 502 }
      );
    }

    const respondingNow = lead.status === "new";
    const note = `[${new Date().toISOString().slice(0, 10)}] Email sent via Resend (${delivery.id ?? "no id"}): "${subject}"`;
    const rows = await sql`
      UPDATE leads
      SET status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
          first_response_at = COALESCE(first_response_at, NOW()),
          notes = CASE WHEN notes IS NULL OR notes = '' THEN ${note} ELSE notes || E'\n\n' || ${note} END,
          updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `;
    const updated = rows[0];

    // Same funnel bookkeeping as the status-dropdown PATCH: the first move off
    // `new` is a `contacted` stage event joined back to this lead.
    if (respondingNow) {
      const funnel = funnelForPersona(String(updated.persona));
      const stage = stageForLeadStatus("contacted");
      if (funnel && stage) {
        await recordFunnelEventSafely(sql, {
          funnel: funnel.slug,
          stage,
          path: funnel.path,
          area: typeof updated.area === "string" ? updated.area : null,
          placement: "admin-lead-reply",
          campaignSource: typeof updated.source === "string" ? updated.source : null,
          leadId: Number(updated.id),
          valueCents: typeof updated.value_cents === "number" ? updated.value_cents : null,
          isTest: updated.is_test === true,
          payload: { status: "contacted", previous_status: "new", email_id: delivery.id ?? null },
        });
      }
    }

    return NextResponse.json({ lead: updated, emailId: delivery.id ?? null });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
