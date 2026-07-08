import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const STATUSES = ["new", "contacted", "qualified", "won", "lost"];

// PATCH: update a lead's status and/or notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (status !== undefined && !STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
    }

    const sql = getDb();
    const rows = await sql`
      UPDATE leads
      SET status = COALESCE(${status ?? null}, status),
          notes = COALESCE(${typeof notes === "string" ? notes.slice(0, 5000) : null}, notes),
          updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
