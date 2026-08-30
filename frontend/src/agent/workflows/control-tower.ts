import { getDb } from "@/lib/db";
import {
  createAgentIncident,
  createAgentRun,
  createAgentTask,
  expireAgentApprovals,
  finishAgentRun,
  recordAgentStep,
  writeAgentAudit,
} from "@/src/agent/durable-store";

type ControlTowerCount = {
  pendingApprovals: number;
  overdueTasks: number;
  openIncidents: number;
  blockedCampaigns: number;
  campaignsMissingTracking: number;
  claimsNeedingProof: number;
};

async function readControlTowerCounts() {
  const sql = getDb();
  const [agentRows, optionalTables] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM agent_approvals WHERE status = 'pending' AND expires_at > NOW()) AS "pendingApprovals",
        (SELECT COUNT(*)::int FROM agent_tasks WHERE status IN ('pending', 'in_progress') AND due_at IS NOT NULL AND due_at < NOW()) AS "overdueTasks",
        (SELECT COUNT(*)::int FROM agent_incidents WHERE status IN ('open', 'acknowledged')) AS "openIncidents"
    `,
    sql`SELECT to_regclass('public.campaigns') AS campaigns, to_regclass('public.claim_substantiation') AS claim_substantiation`,
  ]);

  let blockedCampaigns = 0;
  let campaignsMissingTracking = 0;
  let claimsNeedingProof = 0;
  if (optionalTables[0]?.campaigns) {
    const rows = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM campaigns WHERE status IN ('scheduled', 'live') AND (label IS NULL OR label = '')) AS "blockedCampaigns",
        (SELECT COUNT(*)::int FROM campaigns WHERE status IN ('scheduled', 'live') AND (utm_campaign IS NULL OR utm_campaign = '')) AS "campaignsMissingTracking"
    `;
    blockedCampaigns = Number(rows[0]?.blockedCampaigns || 0);
    campaignsMissingTracking = Number(rows[0]?.campaignsMissingTracking || 0);
  }
  if (optionalTables[0]?.claim_substantiation) {
    const rows = await sql`SELECT COUNT(*)::int AS count FROM claim_substantiation WHERE status IN ('needed', 'submitted')`;
    claimsNeedingProof = Number(rows[0]?.count || 0);
  }

  return {
    pendingApprovals: Number(agentRows[0]?.pendingApprovals || 0),
    overdueTasks: Number(agentRows[0]?.overdueTasks || 0),
    openIncidents: Number(agentRows[0]?.openIncidents || 0),
    blockedCampaigns,
    campaignsMissingTracking,
    claimsNeedingProof,
  } satisfies ControlTowerCount;
}

export async function getControlTowerSnapshot(limit = 25) {
  const sql = getDb();
  await expireAgentApprovals();
  const [counts, runs, tasks, incidents] = await Promise.all([
    readControlTowerCounts(),
    sql`SELECT id, agent_name, workflow_name, status, initiated_by, error_code, started_at, finished_at, created_at FROM agent_runs ORDER BY created_at DESC LIMIT ${limit}`,
    sql`SELECT id, kind, entity_type, entity_id, priority, status, due_at, owner_role, dedupe_key, last_error, created_at, updated_at FROM agent_tasks ORDER BY created_at DESC LIMIT ${limit}`,
    sql`SELECT id, severity, workflow, entity_type, entity_id, error_code, details_redacted, status, owner_role, created_at, resolved_at FROM agent_incidents ORDER BY created_at DESC LIMIT ${limit}`,
  ]);
  return { counts, runs, tasks, incidents };
}

export async function runControlTower(input: {
  initiatedBy: string;
  traceId?: string;
}): Promise<ControlTowerCount & { runId: string }> {
  const runId = `tower_${crypto.randomUUID()}`;
  await createAgentRun({
    id: runId,
    agentName: "operations_control_tower",
    workflowName: "daily_control_scan",
    version: "2026-08-30.1",
    initiatedBy: input.initiatedBy,
    policyVersion: "operations-v1",
    traceId: input.traceId,
  });

  try {
    await expireAgentApprovals();
    const sql = getDb();
    await sql`UPDATE agent_runs SET status = 'running', updated_at = NOW() WHERE id = ${runId}`;

    const counts = await readControlTowerCounts();

    await recordAgentStep({
      runId,
      stepName: "scan_operational_queues",
      toolName: "neon.read_control_tower_counts",
      input: { tables: ["agent_approvals", "agent_tasks", "agent_incidents", "campaigns", "claim_substantiation"] },
      output: counts,
      status: "completed",
    });

    if (counts.overdueTasks > 0) {
      await createAgentTask({
        kind: "review_overdue_agent_tasks",
        ownerRole: "operations",
        priority: "high",
        dedupeKey: "control-tower:overdue-agent-tasks",
        payload: { count: counts.overdueTasks },
      });
    }

    if (counts.blockedCampaigns > 0 || counts.claimsNeedingProof > 0) {
      await createAgentTask({
        kind: "review_campaign_readiness",
        ownerRole: "operations",
        priority: "high",
        dedupeKey: "control-tower:campaign-readiness",
        payload: {
          blockedCampaigns: counts.blockedCampaigns,
          claimsNeedingProof: counts.claimsNeedingProof,
        },
      });
    }

    if (counts.openIncidents > 0) {
      await createAgentTask({
        kind: "review_open_agent_incidents",
        ownerRole: "operations",
        priority: "urgent",
        dedupeKey: "control-tower:open-agent-incidents",
        payload: { count: counts.openIncidents },
      });
    }

    await writeAgentAudit({
      actorId: runId,
      entityType: "agent_run",
      entityId: runId,
      action: "control_tower_scan_completed",
      sourceRoute: "control-tower-workflow",
      after: counts,
    });
    await finishAgentRun(runId, "completed");
    return { ...counts, runId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown control tower error";
    await recordAgentStep({
      runId,
      stepName: "scan_operational_queues",
      toolName: "neon.read_control_tower_counts",
      input: {},
      output: { error: message },
      status: "failed",
      errorCode: "CONTROL_TOWER_SCAN_FAILED",
    });
    await createAgentIncident({
      severity: "P1",
      workflow: "daily_control_scan",
      errorCode: "CONTROL_TOWER_SCAN_FAILED",
      details: { message },
      ownerRole: "operations",
    });
    await finishAgentRun(runId, "failed", "CONTROL_TOWER_SCAN_FAILED");
    throw error;
  }
}
