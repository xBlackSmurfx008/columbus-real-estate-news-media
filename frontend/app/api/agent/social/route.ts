import { NextRequest, NextResponse } from "next/server";
import { isAgentResponse, requireAgentCapability } from "@/lib/agent-auth";
import { hasAgentCapability } from "@/src/agent/policy/capabilities";
import { processInboundSocialDm, sendThreadReply } from "@/src/agent/email/engine";
import { threadsStore } from "@/src/agent/store";

interface SocialInboundPayload {
  fromHandle: string;
  body: string;
  provider: string;
  providerThreadId: string;
}

interface SocialApprovalPayload {
  threadId: string;
  approved: boolean;
  reason?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "social:process");
    if (isAgentResponse(session)) return session;
    const threads = [...threadsStore.values()].filter((thread) => thread.channel === "social_dm");
    return NextResponse.json({ ok: true, threads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "social:process");
    if (isAgentResponse(session)) return session;
    const payload = (await request.json()) as SocialInboundPayload | SocialApprovalPayload;

    if ("fromHandle" in payload) {
      if (!payload.fromHandle || !payload.body || !payload.provider || !payload.providerThreadId) {
        return NextResponse.json(
          { error: "Required fields: fromHandle, body, provider, providerThreadId." },
          { status: 400 },
        );
      }
      const thread = await processInboundSocialDm(payload);
      return NextResponse.json({ ok: true, thread });
    }

    if (!hasAgentCapability(session.role, "social:approve")) {
      return NextResponse.json({ error: "Forbidden", capability: "social:approve" }, { status: 403 });
    }
    if (!payload.threadId || typeof payload.approved !== "boolean") {
      return NextResponse.json({ error: "Required fields: threadId, approved." }, { status: 400 });
    }
    const thread = await sendThreadReply(payload.threadId, payload.approved, payload.reason);
    return NextResponse.json({ ok: true, thread });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
