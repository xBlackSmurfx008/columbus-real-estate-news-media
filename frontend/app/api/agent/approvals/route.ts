import { NextRequest, NextResponse } from "next/server";
import { isAgentResponse, requireAgentCapability } from "@/lib/agent-auth";
import {
  decideAgentApproval,
  listPendingAgentApprovals,
  requestAgentApproval,
} from "@/src/agent/durable-store";

type ApprovalPayload =
  | {
      action: "list";
      limit?: number;
    }
  | {
      action: "request";
      runId: string;
      stepId?: string;
      actionClass: "read" | "draft" | "internal_write" | "external_execute" | "irreversible";
      risk: "low" | "medium" | "high";
      payload: unknown;
      requiredRole: string;
      expiresAt: string;
    }
  | {
      action: "decide";
      approvalId: string;
      decision: "approved" | "rejected" | "revision_requested" | "paused";
      reason?: string;
    };

export async function GET(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "email:approve");
    if (isAgentResponse(session)) return session;
    const approvals = await listPendingAgentApprovals();
    return NextResponse.json({ ok: true, approvals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown approval error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "email:approve");
    if (isAgentResponse(session)) return session;
    const payload = (await request.json()) as ApprovalPayload;

    if (payload.action === "list") {
      const approvals = await listPendingAgentApprovals(payload.limit);
      return NextResponse.json({ ok: true, approvals });
    }
    if (payload.action === "request") {
      const approval = await requestAgentApproval(payload);
      return NextResponse.json({ ok: true, approval });
    }
    if (payload.action === "decide") {
      const approval = await decideAgentApproval(
        payload.approvalId,
        payload.decision,
        `user:${session.userId}`,
        payload.reason,
      );
      return NextResponse.json({ ok: true, approval });
    }
    return NextResponse.json({ error: "Invalid approval action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown approval error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
