import { NextResponse } from "next/server";
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
    };

export async function GET() {
  try {
    return NextResponse.json({ ok: true, snapshot: getSequenceSnapshot() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
      const enrollment = await executeSequenceStep(payload.enrollmentId);
      return NextResponse.json({ ok: true, enrollment });
    }
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
