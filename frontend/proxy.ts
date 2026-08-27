import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// The /api/agent/* routes are an internal pilot with no auth of their own.
// Gate them all behind the admin session cookie.
export async function proxy(request: NextRequest) {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Admin authentication is unavailable" },
      { status: 503 }
    );
  }

  const token = request.cookies.get("cren_admin_token")?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      return NextResponse.next();
    } catch {
      // Fall through to the unauthorized response.
    }
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: "/api/agent/:path*",
};
