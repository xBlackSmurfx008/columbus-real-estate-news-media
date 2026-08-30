import { getDb } from "@/lib/db";
import {
  createAgentIncident,
  createAgentRun,
  createAgentTask,
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
    const sql = getDb();
    await sql`UPDATE agent_runs SET status = 'running', updated_at = NOW() WHERE id = ${runId}`;

    const rows = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM agent_approvals WHERE status = 'pending' AND expires_at > NOW()) AS "pendingApprovals",
        (SELECT COUNT(*)::int FROM agent_tasks WHERE status IN ('pending', 'in_progress') AND due_at IS NOT NULL AND due_at < NOW()) AS "overdueTasks",
        (SELECT COUNT(*)::int FROM agent_incidents WHERE status IN ('open', 'acknowledged')) AS "openIncidents",
        (SELECT COUNT(*)::int FROM campaigns WHERE status IN ('scheduled', 'live') AND (label IS NULL OR label = '')) AS "blockedCampaigns",
        (SELECT COUNT(*)::int FROM campaigns WHERE status IN ('scheduled', 'live') AND (utm_campaign IS NULL OR utm_campaign = '')) AS "campaignsMissingTracking",
        (SELECT COUNT(*)::int FROM claim_substantiation WHERE status IN ('needed', 'submitted')) AS "claimsNeedingProof"
    `;
    const counts = rows[0] as unknown as ControlTowerCount;

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
