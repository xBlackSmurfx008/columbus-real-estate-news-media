import { NextRequest, NextResponse } from "next/server";
import { isAgentResponse, requireAgentCapability } from "@/lib/agent-auth";
import { getControlTowerSnapshot, runControlTower } from "@/src/agent/workflows/control-tower";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "report:read");
    if (isAgentResponse(session)) return session;
    return NextResponse.json({ ok: true, snapshot: await getControlTowerSnapshot() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown control tower error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "report:write");
    if (isAgentResponse(session)) return session;
    const result = await runControlTower({
      initiatedBy: `user:${session.userId}`,
      traceId: request.headers.get("x-agent-trace-id") || undefined,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
