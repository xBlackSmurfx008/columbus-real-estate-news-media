import { NextRequest, NextResponse } from "next/server";
import { isAgentResponse, requireAgentCapability } from "@/lib/agent-auth";
import { getDashboardMetrics } from "@/src/agent/reporting/kpi";
import { crmAdapter } from "@/src/agent/integrations/crm";
import { getBillingSnapshot } from "@/src/agent/workflows/billing";
import { getSequenceSnapshot } from "@/src/agent/workflows/sequences";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "dashboard:read");
    if (isAgentResponse(session)) return session;
    return NextResponse.json({
      ok: true,
      metrics: await getDashboardMetrics(),
      crm: await crmAdapter.getSnapshot(),
      billing: getBillingSnapshot(),
      sequences: getSequenceSnapshot(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
