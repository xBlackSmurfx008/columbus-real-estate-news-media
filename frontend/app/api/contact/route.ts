import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST: contact form submission (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message, source } = body;

    if (typeof name !== "string" || !name.trim() || name.length > 200) {
      return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (typeof message !== "string" || !message.trim() || message.length > 5000) {
      return NextResponse.json({ error: "Enter a message." }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      INSERT INTO contacts (name, email, message, source, status)
      VALUES (${name.trim()}, ${email}, ${message.trim()}, ${source ?? null}, 'new')
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
