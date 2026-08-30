import { NextRequest, NextResponse } from "next/server";
import { isAgentResponse, requireAgentCapability } from "@/lib/agent-auth";
import { sendThreadReply } from "@/src/agent/email/engine";

interface ApprovalPayload {
  threadId: string;
  approved: boolean;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "email:approve");
    if (isAgentResponse(session)) return session;
    const payload = (await request.json()) as ApprovalPayload;
    if (!payload.threadId || typeof payload.approved !== "boolean") {
      return NextResponse.json(
        { error: "Required fields: threadId, approved." },
        { status: 400 },
      );
    }
    const thread = await sendThreadReply(payload.threadId, payload.approved, payload.reason);
    return NextResponse.json({ ok: true, thread });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
