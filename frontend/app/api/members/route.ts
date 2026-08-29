import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { setMemberSessionCookie, signMemberToken } from "@/lib/member-auth";
import { sendTelegramInquiry } from "@/lib/telegram-inquiry";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST: free membership signup (public). Upserts by email and mirrors
// into subscribers so there is a single email list.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, interests, source } = body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 320) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 10 || password.length > 128) {
      return NextResponse.json({ error: "Use a password with at least 10 characters." }, { status: 400 });
    }

    const sql = getDb();
    const cleanName = typeof name === "string" ? name.trim().slice(0, 200) : null;
    const cleanInterests = typeof interests === "string" ? interests.slice(0, 500) : null;
    if (!cleanName) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    const passwordHash = await bcrypt.hash(password, 12);

    const [member] = await sql`
      INSERT INTO members (email, name, interests, password_hash, tier, status)
      VALUES (${normalizedEmail}, ${cleanName}, ${cleanInterests}, ${passwordHash}, 'free', 'active')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, name, interests, preferred_area, role, bio, tier, status
    `;
    if (!member) {
      return NextResponse.json({ error: "An account already exists for this email. Sign in to continue." }, { status: 409 });
    }

    // Mirror into subscribers (select-then-write; table predates the index).
    const existing = await sql`SELECT id FROM subscribers WHERE email = ${normalizedEmail} LIMIT 1`;
    if (existing.length > 0) {
      await sql`UPDATE subscribers SET topic = COALESCE(${cleanInterests}, topic), status = 'active', updated_at = NOW() WHERE id = ${existing[0].id}`;
    } else {
      await sql`
        INSERT INTO subscribers (email, area, topic, source, status)
        VALUES (${normalizedEmail}, null, ${cleanInterests}, ${typeof source === "string" ? source.slice(0, 120) : "join"}, 'active')
      `;
    }

    await setMemberSessionCookie(await signMemberToken({ userId: member.id, email: member.email }));

    await sendTelegramInquiry({
      kind: 'membership',
      recordId: member.id,
      name: cleanName,
      email: normalizedEmail,
      interests: cleanInterests,
      source: typeof source === 'string' ? source.slice(0, 120) : 'join',
    });

    return NextResponse.json({ ok: true, profile: member }, { status: 201 });
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
    const members = await sql`
      SELECT id, email, name, interests, preferred_area, role, bio, tier, status, created_at, updated_at
      FROM members ORDER BY created_at DESC LIMIT 500
    `;
    return NextResponse.json({ members });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
