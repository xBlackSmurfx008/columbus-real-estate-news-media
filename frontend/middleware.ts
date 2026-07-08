import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "cren-default-secret-change-me-in-production"
);

// The /api/agent/* routes are an internal pilot with no auth of their own.
// Gate them all behind the admin session cookie.
export async function middleware(request: NextRequest) {
  const token = request.cookies.get("cren_admin_token")?.value;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // fall through to 401
    }
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: "/api/agent/:path*",
};
