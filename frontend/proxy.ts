import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/admin-token";

// The /api/agent/* routes are an internal pilot with no auth of their own.
// Gate them all behind the admin session cookie.
export async function proxy(request: NextRequest) {
  // This legacy pilot still uses process-local Maps. Production jobs use the
  // durable admin/cron endpoints instead; a session must not re-enable it.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'LEGACY_AGENT_PILOT_DISABLED',
      detail: 'Use the durable operations control tower.' }, { status: 503 });
  }
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
      if (await verifyToken(token)) return NextResponse.next();
    } catch {
      // Fall through to the unauthorized response.
    }
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: "/api/agent/:path*",
};
