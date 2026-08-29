import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const MEMBER_COOKIE_NAME = "cren_member_token";

type MemberToken = {
  userId: number;
  email: string;
  role: "member";
};

function getMemberJwtSecret(): Uint8Array {
  const secret = process.env.MEMBER_JWT_SECRET || process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error("MEMBER_JWT_SECRET or ADMIN_JWT_SECRET is required");
  return new TextEncoder().encode(secret);
}

export async function signMemberToken(payload: Omit<MemberToken, "role">) {
  return new SignJWT({ ...payload, role: "member" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getMemberJwtSecret());
}

export async function verifyMemberToken(token: string): Promise<MemberToken | null> {
  try {
    const { payload } = await jwtVerify(token, getMemberJwtSecret());
    if (payload.role !== "member" || typeof payload.userId !== "number" || typeof payload.email !== "string") {
      return null;
    }
    return { userId: payload.userId, email: payload.email, role: "member" };
  } catch {
    return null;
  }
}

export async function getMemberSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_COOKIE_NAME)?.value;
  return token ? verifyMemberToken(token) : null;
}

export async function setMemberSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearMemberSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(MEMBER_COOKIE_NAME);
}

export async function requireMemberAuth(request: NextRequest) {
  const token = request.cookies.get(MEMBER_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Sign in to manage your profile." }, { status: 401 });

  const session = await verifyMemberToken(token);
  if (!session) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
  return session;
}
