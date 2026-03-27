import { NextResponse } from "next/server";
import { getDashboardMetrics } from "@/src/agent/reporting/kpi";
import { crmAdapter } from "@/src/agent/integrations/crm";
import { getBillingSnapshot } from "@/src/agent/workflows/billing";
import { getSequenceSnapshot } from "@/src/agent/workflows/sequences";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      metrics: getDashboardMetrics(),
      crm: crmAdapter.getSnapshot(),
      billing: getBillingSnapshot(),
      sequences: getSequenceSnapshot(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
