import { NextRequest, NextResponse } from "next/server";
import { isAgentResponse, requireAgentCapability } from "@/lib/agent-auth";
import {
  buildDailyDigest,
  getEscalationAlerts,
  getReports,
} from "@/src/agent/reporting/digest";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "report:read");
    if (isAgentResponse(session)) return session;
    return NextResponse.json({
      ok: true,
      reports: getReports(),
      alerts: await getEscalationAlerts(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "report:write");
    if (isAgentResponse(session)) return session;
    const report = await buildDailyDigest();
    const alerts = await getEscalationAlerts();
    return NextResponse.json({ ok: true, report, alerts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
