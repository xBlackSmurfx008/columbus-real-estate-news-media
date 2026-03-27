import { NextResponse } from "next/server";
import { runPilotUAT } from "@/src/agent/pilot/uat";

export async function POST() {
  try {
    const result = await runPilotUAT();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
