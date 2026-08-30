import { NextResponse } from "next/server";
import { runControlTower } from "@/src/agent/workflows/control-tower";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: Request): boolean {
  const authorization = request.headers.get("authorization");
  return [process.env.CRON_SECRET, process.env.NEWSROOM_CREN_TRIGGER_SECRET]
    .some((secret) => Boolean(secret) && authorization === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const result = await runControlTower({ initiatedBy: "cron:agent-control-tower" });
      return NextResponse.json({ ok: true, attempt, result });
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return NextResponse.json({
    ok: false,
    error: lastError instanceof Error ? lastError.message : "CONTROL_TOWER_FAILED",
  }, { status: 500 });
}

export const POST = GET;
