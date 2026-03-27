import { NextResponse } from "next/server";
import {
  buildDailyDigest,
  getEscalationAlerts,
  getReports,
} from "@/src/agent/reporting/digest";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      reports: getReports(),
      alerts: getEscalationAlerts(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const report = buildDailyDigest();
    const alerts = getEscalationAlerts();
    return NextResponse.json({ ok: true, report, alerts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
