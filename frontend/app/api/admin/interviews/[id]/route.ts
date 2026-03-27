import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// PUT: Update interview by id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();

    const sql = getDb();

    const existing = await sql`SELECT id FROM interviews WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const result = await sql`
      UPDATE interviews SET
        title = COALESCE(${body.title ?? null}, title),
        subject = COALESCE(${body.subject ?? null}, subject),
        interviewer = COALESCE(${body.interviewer ?? null}, interviewer),
        date = COALESCE(${body.date ?? null}, date),
        status = COALESCE(${body.status ?? null}, status),
        featured = COALESCE(${body.featured ?? null}, featured),
        excerpt = COALESCE(${body.excerpt ?? null}, excerpt),
        body = COALESCE(${body.body ?? null}, body),
        read_time = COALESCE(${body.read_time ?? null}, read_time),
        name = COALESCE(${body.name ?? null}, name),
        initials = COALESCE(${body.initials ?? null}, initials),
        role = COALESCE(${body.role ?? null}, role),
        topic = COALESCE(${body.topic ?? null}, topic),
        sort_order = COALESCE(${body.sort_order ?? null}, sort_order),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// DELETE: Remove interview by id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const sql = getDb();

    const existing = await sql`SELECT id FROM interviews WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    await sql`DELETE FROM interviews WHERE id = ${id}`;
    return NextResponse.json({ success: true, message: "Interview deleted" });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
