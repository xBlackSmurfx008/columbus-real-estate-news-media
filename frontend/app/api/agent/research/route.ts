import { NextRequest, NextResponse } from "next/server";
import { isAgentResponse, requireAgentCapability } from "@/lib/agent-auth";
import {
  createAgentRun,
  createSourcePacket,
  finishAgentRun,
  recordAgentStep,
  writeAgentAudit,
} from "@/src/agent/durable-store";

interface ResearchPayload {
  subject: string;
  question?: string;
  sourceUrls: string[];
  notes?: string;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let runId: string | undefined;
  try {
    const session = await requireAgentCapability(request, "research:prepare");
    if (isAgentResponse(session)) return session;

    const payload = (await request.json()) as ResearchPayload;
    if (!payload.subject || !Array.isArray(payload.sourceUrls) || payload.sourceUrls.length === 0) {
      return NextResponse.json(
        { error: "Required fields: subject, sourceUrls (at least one URL)." },
        { status: 400 },
      );
    }
    if (payload.sourceUrls.some((url) => !isHttpUrl(url))) {
      return NextResponse.json({ error: "sourceUrls must contain HTTP(S) URLs." }, { status: 400 });
    }

    runId = `research_${crypto.randomUUID()}`;
    await createAgentRun({
      id: runId,
      agentName: "research_production_desk",
      workflowName: "create_source_packet",
      version: "2026-08-30.1",
      initiatedBy: `user:${session.userId}`,
      policyVersion: "research-v1",
      traceId: request.headers.get("x-agent-trace-id") || undefined,
    });

    const packetId = `source_${crypto.randomUUID()}`;
    const packet = await createSourcePacket({
      id: packetId,
      subject: payload.subject,
      question: payload.question,
      sourceUrls: payload.sourceUrls,
      packet: {
        notes: payload.notes || null,
        reviewStatus: "needs_review",
        submittedBy: session.email,
      },
      agentRunId: runId,
    });
    await recordAgentStep({
      runId,
      stepName: "create_source_packet",
      toolName: "neon.write_source_packet",
      input: { subject: payload.subject, sourceUrls: payload.sourceUrls },
      output: { packetId },
      status: "completed",
    });
    await writeAgentAudit({
      actorId: runId,
      entityType: "source_packet",
      entityId: packetId,
      action: "source_packet_created_for_review",
      sourceRoute: "/api/agent/research",
      after: { packetId, sourceCount: payload.sourceUrls.length },
    });
    await finishAgentRun(runId, "completed");
    return NextResponse.json({ ok: true, runId, packet });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown research error";
    if (runId) await finishAgentRun(runId, "failed", "RESEARCH_PACKET_FAILED").catch(() => undefined);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
