import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "cren-default-secret-change-me-in-production"
);
const COOKIE_NAME = "cren_admin_token";

export async function signToken(payload: { userId: number; email: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: number; email: string; role: string };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Simple password hashing using Web Crypto (no bcrypt needed in edge)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + (process.env.ADMIN_JWT_SECRET || "cren-salt"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

export async function createPasswordHash(password: string): Promise<string> {
  return hashPassword(password);
}

// Middleware helper for API routes
export async function requireAuth(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = await verifyToken(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  return session;
}

// Create initial admin user if none exists
export async function ensureAdminUser() {
  const sql = getDb();
  const users = await sql`SELECT COUNT(*) as count FROM admin_users`;
  if (Number(users[0].count) === 0) {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "cren2026admin";
    const hash = await createPasswordHash(defaultPassword);
    await sql`INSERT INTO admin_users (email, password_hash, name, role)
      VALUES ('admin@columbusrealestatenews.com', ${hash}, 'Admin', 'admin')`;
    return { created: true, email: "admin@columbusrealestatenews.com" };
  }
  return { created: false };
}
