import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const threads = [...threadsStore.values()].filter((thread) => thread.channel === "social_dm");
    return NextResponse.json({ ok: true, threads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
