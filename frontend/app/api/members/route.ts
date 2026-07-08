import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST: free membership signup (public). Upserts by email and mirrors
// into subscribers so there is a single email list.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, interests, source } = body;

    if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const sql = getDb();
    const cleanName = typeof name === "string" ? name.trim().slice(0, 200) : null;
    const cleanInterests = typeof interests === "string" ? interests.slice(0, 500) : null;

    await sql`
      INSERT INTO members (email, name, interests, tier, status)
      VALUES (${email}, ${cleanName}, ${cleanInterests}, 'free', 'active')
      ON CONFLICT (email) DO UPDATE
      SET name = COALESCE(EXCLUDED.name, members.name),
          interests = COALESCE(EXCLUDED.interests, members.interests),
          status = 'active',
          updated_at = NOW()
    `;

    // Mirror into subscribers (select-then-write; table predates the index).
    const existing = await sql`SELECT id FROM subscribers WHERE email = ${email} LIMIT 1`;
    if (existing.length > 0) {
      await sql`UPDATE subscribers SET status = 'active', updated_at = NOW() WHERE id = ${existing[0].id}`;
    } else {
      await sql`
        INSERT INTO subscribers (email, area, topic, source, status)
        VALUES (${email}, null, ${cleanInterests}, ${typeof source === "string" ? source.slice(0, 120) : "join"}, 'active')
      `;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// GET: admin-only member listing
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const sql = getDb();
    const members = await sql`SELECT * FROM members ORDER BY created_at DESC LIMIT 500`;
    return NextResponse.json({ members });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
