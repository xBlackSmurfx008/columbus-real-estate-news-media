import { NextResponse } from "next/server";
import { processInboundEmail } from "@/src/agent/email/engine";
import { emailGateway } from "@/src/agent/integrations/email";

interface EmailRoutePayload {
  from: string;
  subject: string;
  body: string;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as EmailRoutePayload | { action: "sync"; messages: EmailRoutePayload[] };

    if ("action" in payload && payload.action === "sync") {
      const synced = await emailGateway.syncInbox(payload.messages || []);
      const processed = [];
      for (const message of payload.messages || []) {
        processed.push(
          await processInboundEmail({
            from: message.from,
            subject: message.subject,
            body: message.body,
          }),
        );
      }
      return NextResponse.json({
        ok: true,
        synced: synced.synced,
        processedCount: processed.length,
      });
    }

    if ("action" in payload) {
      return NextResponse.json({ error: "Invalid email action payload." }, { status: 400 });
    }

    if (!payload.from || !payload.subject || !payload.body) {
      return NextResponse.json(
        { error: "Required fields: from, subject, body." },
        { status: 400 },
      );
    }
    const thread = await processInboundEmail(payload);
    return NextResponse.json({ ok: true, thread });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      mailbox: emailGateway.getMailboxSnapshot(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
