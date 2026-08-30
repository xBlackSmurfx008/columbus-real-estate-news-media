import { getDb } from "@/lib/db";
import { createHash } from "node:crypto";

export type AgentRunStatus =
  | "queued"
  | "running"
  | "waiting_on_input"
  | "waiting_on_approval"
  | "completed"
  | "failed"
  | "blocked"
  | "cancelled";

export type AgentActionClass = "read" | "draft" | "internal_write" | "external_execute" | "irreversible";

export interface AgentRunInput {
  id: string;
  agentName: string;
  workflowName: string;
  version: string;
  initiatedBy: string;
  entityType?: string;
  entityId?: string;
  policyVersion?: string;
  traceId?: string;
}

export interface AgentStepInput {
  runId: string;
  stepName: string;
  toolName?: string;
  input: unknown;
  output?: unknown;
  status: "running" | "completed" | "failed" | "blocked";
  errorCode?: string;
}

export interface AgentApprovalInput {
  runId: string;
  stepId?: string;
  actionClass: AgentActionClass;
  risk: "low" | "medium" | "high";
  payload: unknown;
  requiredRole: string;
  expiresAt: string;
}

export interface AgentTaskInput {
  kind: string;
  entityType?: string;
  entityId?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  dueAt?: string;
  ownerRole: string;
  dedupeKey: string;
  payload?: unknown;
}

export interface AgentIncidentInput {
  severity: "P0" | "P1" | "P2" | "P3";
  workflow: string;
  entityType?: string;
  entityId?: string;
  errorCode: string;
  details: unknown;
  ownerRole: string;
}

export interface SourcePacketInput {
  id: string;
  subject: string;
  question?: string;
  sourceUrls: string[];
  sourceHashes?: string[];
  packet: unknown;
  agentRunId?: string;
}

function json(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function hash(value: unknown): string {
  return createHash("sha256").update(json(value)).digest("hex");
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
      if (/(password|secret|token|authorization|api[-_]?key)/i.test(key)) return [key, "[REDACTED]"];
      return [key, redact(entry)];
    }));
  }
  if (typeof value === "string") {
    return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]");
  }
  return value;
}

export async function createAgentRun(input: AgentRunInput) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO agent_runs (
      id, agent_name, workflow_name, version, status, initiated_by,
      entity_type, entity_id, policy_version, trace_id
    ) VALUES (
      ${input.id}, ${input.agentName}, ${input.workflowName}, ${input.version},
      'queued', ${input.initiatedBy}, ${input.entityType || null},
      ${input.entityId || null}, ${input.policyVersion || null}, ${input.traceId || null}
    )
    RETURNING *
  `;
  return rows[0];
}

export async function finishAgentRun(
  id: string,
  status: AgentRunStatus,
  errorCode?: string,
) {
  const sql = getDb();
  const rows = await sql`
    UPDATE agent_runs
    SET status = ${status}, error_code = ${errorCode || null}, finished_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0];
}

export async function recordAgentStep(input: AgentStepInput) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO agent_steps (
      run_id, step_name, tool_name, input_hash, input_json, output_json, status, error_code,
      finished_at
    ) VALUES (
      ${input.runId}, ${input.stepName}, ${input.toolName || null},
      ${hash(input.input)}, ${json(input.input)}::jsonb, ${json(input.output)}::jsonb, ${input.status},
      ${input.errorCode || null}, CASE WHEN ${input.status} IN ('completed', 'failed', 'blocked') THEN NOW() ELSE NULL END
    )
    RETURNING *
  `;
  return rows[0];
}

export async function requestAgentApproval(input: AgentApprovalInput) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO agent_approvals (
      run_id, step_id, action_class, risk, payload_json, required_role,
      status, expires_at
    ) VALUES (
      ${input.runId}, ${input.stepId || null}, ${input.actionClass}, ${input.risk},
      ${json(input.payload)}::jsonb, ${input.requiredRole}, 'pending', ${input.expiresAt}
    )
    RETURNING *
  `;
  return rows[0];
}

export async function decideAgentApproval(
  id: string,
  decision: "approved" | "rejected" | "revision_requested" | "paused",
  decidedBy: string,
  reason?: string,
) {
  const sql = getDb();
  const rows = await sql`
    UPDATE agent_approvals
    SET status = ${decision}, decided_by = ${decidedBy}, decided_at = NOW(), reason = ${reason || null}
    WHERE id = ${id} AND status = 'pending' AND expires_at > NOW()
    RETURNING *
  `;
  if (!rows[0]) throw new Error("Approval not found, already decided, or expired.");
  return rows[0];
}

export async function resumeAgentApproval(id: string, resumedBy: string, reason?: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE agent_approvals
    SET status = 'pending', decided_by = ${resumedBy}, decided_at = NULL,
        reason = ${reason || "Resumed for review."}
    WHERE id = ${id} AND status = 'paused' AND expires_at > NOW()
    RETURNING *
  `;
  if (!rows[0]) throw new Error("Approval not found, expired, or not paused.");
  return rows[0];
}

export async function listPendingAgentApprovals(limit = 50) {
  const sql = getDb();
  return sql`
    SELECT * FROM agent_approvals
    WHERE status = 'pending' AND expires_at > NOW()
    ORDER BY requested_at ASC
    LIMIT ${limit}
  `;
}

export async function listAgentApprovals(limit = 50) {
  const sql = getDb();
  return sql`
    SELECT agent_approvals.*, agent_runs.agent_name, agent_runs.workflow_name,
      agent_runs.version AS agent_version, agent_runs.trace_id, agent_runs.initiated_by
    FROM agent_approvals
    JOIN agent_runs ON agent_runs.id = agent_approvals.run_id
    WHERE (agent_approvals.status = 'pending' AND agent_approvals.expires_at > NOW())
      OR agent_approvals.status = 'paused'
    ORDER BY agent_approvals.requested_at ASC
    LIMIT ${limit}
  `;
}

export async function expireAgentApprovals() {
  const sql = getDb();
  return sql`
    UPDATE agent_approvals
    SET status = 'paused', reason = 'Approval expired before decision.', decided_at = COALESCE(decided_at, NOW())
    WHERE status = 'pending' AND expires_at <= NOW()
    RETURNING id
  `;
}

export async function claimAgentApproval(id: string, expectedPayload: unknown) {
  const sql = getDb();
  const rows = await sql`
    UPDATE agent_approvals
    SET status = 'executing'
    WHERE id = ${id}
      AND status = 'approved'
      AND expires_at > NOW()
      AND payload_json = ${json(expectedPayload)}::jsonb
    RETURNING *
  `;
  if (!rows[0]) throw new Error("Approval is missing, expired, already used, or payload changed.");
  return rows[0];
}

export async function completeAgentApproval(id: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE agent_approvals
    SET status = 'executed', decided_at = COALESCE(decided_at, NOW())
    WHERE id = ${id} AND status = 'executing'
    RETURNING *
  `;
  if (!rows[0]) throw new Error("Approval execution record not found.");
  return rows[0];
}

export async function createAgentTask(input: AgentTaskInput) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO agent_tasks (
      kind, entity_type, entity_id, priority, status, due_at, owner_role,
      dedupe_key, payload_json
    ) VALUES (
      ${input.kind}, ${input.entityType || null}, ${input.entityId || null},
      ${input.priority || "normal"}, 'pending', ${input.dueAt || null},
      ${input.ownerRole}, ${input.dedupeKey}, ${json(input.payload)}::jsonb
    )
    ON CONFLICT (dedupe_key) DO UPDATE
    SET updated_at = NOW()
    RETURNING *
  `;
  return rows[0];
}

export async function createAgentIncident(input: AgentIncidentInput) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO agent_incidents (
      severity, workflow, entity_type, entity_id, error_code,
      details_redacted, status, owner_role
    ) VALUES (
      ${input.severity}, ${input.workflow}, ${input.entityType || null},
      ${input.entityId || null}, ${input.errorCode}, ${json(redact(input.details))}::jsonb,
      'open', ${input.ownerRole}
    )
    RETURNING *
  `;
  return rows[0];
}

export async function writeAgentAudit(input: {
  actorId?: string;
  entityType: string;
  entityId?: string;
  action: string;
  sourceRoute?: string;
  before?: unknown;
  after?: unknown;
}) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, entity_type, entity_id, action, source_route,
      before_json, after_json
    ) VALUES (
      'agent', ${input.actorId || null}, ${input.entityType}, ${input.entityId || null},
      ${input.action}, ${input.sourceRoute || null}, ${json(input.before)}::jsonb,
      ${json(input.after)}::jsonb
    )
    RETURNING *
  `;
  return rows[0];
}

export async function createSourcePacket(input: SourcePacketInput) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO source_packets (
      id, subject, question, source_urls, source_hashes, packet_json, agent_run_id
    ) VALUES (
      ${input.id}, ${input.subject}, ${input.question || null},
      ${json(input.sourceUrls)}::jsonb, ${json(input.sourceHashes || [])}::jsonb,
      ${json(input.packet)}::jsonb, ${input.agentRunId || null}
    )
    ON CONFLICT (id) DO UPDATE
    SET subject = EXCLUDED.subject,
        question = EXCLUDED.question,
        source_urls = EXCLUDED.source_urls,
        source_hashes = EXCLUDED.source_hashes,
        packet_json = EXCLUDED.packet_json,
        agent_run_id = EXCLUDED.agent_run_id,
        updated_at = NOW()
    RETURNING *
  `;
  return rows[0];
}
