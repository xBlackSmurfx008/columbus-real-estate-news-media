import { NextRequest, NextResponse } from "next/server";
import { isAgentResponse, requireAgentCapability } from "@/lib/agent-auth";
import { runPilotUAT } from "@/src/agent/pilot/uat";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "pilot:run");
    if (isAgentResponse(session)) return session;
    const payload = await request.json().catch(() => ({}));
    const result = await runPilotUAT({ cleanup: payload.cleanup !== false });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
