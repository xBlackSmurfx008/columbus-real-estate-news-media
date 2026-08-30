import { NextRequest, NextResponse } from "next/server";
import { isAgentResponse, requireAgentCapability } from "@/lib/agent-auth";
import { hasAgentCapability } from "@/src/agent/policy/capabilities";
import { enrollSequence, executeSequenceStep, getSequenceSnapshot, upsertSequence } from "@/src/agent/workflows/sequences";

type SequencePayload =
  | {
      action: "upsert_sequence";
      sequence: {
        id?: string;
        name: string;
        stopOnReply: boolean;
        stopOnMeetingBooked: boolean;
        steps: Array<{
          id: string;
          order: number;
          channel: "email" | "social_dm";
          templateSubject: string;
          templateBody: string;
          waitDaysAfterPrevious: number;
        }>;
      };
    }
  | {
      action: "enroll";
      enrollment: {
        sequenceId: string;
        contactId: string;
        dealId?: string;
      };
    }
  | {
      action: "run_step";
      enrollmentId: string;
      approvalId?: string;
    };

export async function GET(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "sequence:manage");
    if (isAgentResponse(session)) return session;
    return NextResponse.json({ ok: true, snapshot: getSequenceSnapshot() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgentCapability(request, "sequence:manage");
    if (isAgentResponse(session)) return session;
    const payload = (await request.json()) as SequencePayload;
    if (payload.action === "upsert_sequence") {
      const sequence = upsertSequence(payload.sequence);
      return NextResponse.json({ ok: true, sequence });
    }
    if (payload.action === "enroll") {
      const enrollment = enrollSequence(payload.enrollment);
      return NextResponse.json({ ok: true, enrollment });
    }
    if (payload.action === "run_step") {
      if (!hasAgentCapability(session.role, "sequence:execute")) {
        return NextResponse.json({ error: "Forbidden", capability: "sequence:execute" }, { status: 403 });
      }
      const enrollment = await executeSequenceStep(payload.enrollmentId, payload.approvalId);
      return NextResponse.json({ ok: true, enrollment });
    }
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
