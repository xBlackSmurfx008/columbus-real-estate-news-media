import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST: newsletter signup (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, area, topic, source } = body;

    if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const sql = getDb();
    // Select-then-write: subscribers.email uniqueness is enforced by the
    // migration script's index, but older rows may predate it.
    const existing = await sql`SELECT id FROM subscribers WHERE email = ${email} LIMIT 1`;
    if (existing.length > 0) {
      await sql`
        UPDATE subscribers
        SET area = ${area ?? null}, topic = ${topic ?? null}, source = ${source ?? null},
            status = 'active', updated_at = NOW()
        WHERE id = ${existing[0].id}
      `;
    } else {
      await sql`
        INSERT INTO subscribers (email, area, topic, source, status)
        VALUES (${email}, ${area ?? null}, ${topic ?? null}, ${source ?? null}, 'active')
      `;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
