import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  clearMemberSessionCookie,
  getMemberSession,
  requireMemberAuth,
  setMemberSessionCookie,
  signMemberToken,
} from "@/lib/member-auth";

function profileSelect() {
  return "id, email, name, interests, preferred_area, role, bio, tier, status, created_at, updated_at";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

    const sql = getDb();
    const rows = await sql`
      SELECT id, email, password_hash FROM members
      WHERE email = ${email} AND status = 'active' LIMIT 1
    `;
    const member = rows[0];
    if (!member?.password_hash || !(await bcrypt.compare(password, member.password_hash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await setMemberSessionCookie(await signMemberToken({ userId: member.id, email: member.email }));
    const [profile] = await sql.query(`SELECT ${profileSelect()} FROM members WHERE id = $1`, [member.id]);
    return NextResponse.json({ authenticated: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getMemberSession();
    if (!session) return NextResponse.json({ authenticated: false });

    const sql = getDb();
    const [profile] = await sql.query(`SELECT ${profileSelect()} FROM members WHERE id = $1 AND status = 'active'`, [session.userId]);
    if (!profile) {
      await clearMemberSessionCookie();
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({ authenticated: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireMemberAuth(request);
  if (auth instanceof NextResponse) return auth;
  await clearMemberSessionCookie();
  return NextResponse.json({ ok: true });
}
