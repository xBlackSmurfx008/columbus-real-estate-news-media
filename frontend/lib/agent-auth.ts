import { after, NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { beginAgentStateRequest } from "@/src/agent/durable-state";
import { hasAgentCapability, type AgentCapability } from "@/src/agent/policy/capabilities";

export type AgentSession = {
  userId: number;
  email: string;
  role: string;
};

export async function requireAgentCapability(
  request: NextRequest,
  capability: AgentCapability,
): Promise<AgentSession | NextResponse> {
  const session = await requireAuth(request);
  if (session instanceof NextResponse) return session;

  if (!hasAgentCapability(session.role, capability)) {
    return NextResponse.json(
      { error: "Forbidden", capability },
      { status: 403 },
    );
  }

  const finishAgentStateRequest = await beginAgentStateRequest();
  after(() =>
    finishAgentStateRequest().catch((error) => {
      console.error("agent state persistence failed", error);
    }),
  );

  return session;
}

export function isAgentResponse(
  value: AgentSession | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
