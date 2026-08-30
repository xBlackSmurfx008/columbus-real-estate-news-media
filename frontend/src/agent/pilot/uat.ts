import { getDb } from "@/lib/db";
import { processInboundEmail, processInboundSocialDm, sendThreadReply } from "@/src/agent/email/engine";
import { buildDailyDigest } from "@/src/agent/reporting/digest";
import { createOnboardingTasksForDeal } from "@/src/agent/workflows/onboarding";
import { crmAdapter } from "@/src/agent/integrations/crm";
import { listThreads } from "@/src/agent/repositories/inbox";
import { enrollSequence, upsertSequence } from "@/src/agent/workflows/sequences";
import { upsertContract, upsertInvoice } from "@/src/agent/workflows/billing";
import { getDashboardMetrics } from "@/src/agent/reporting/kpi";
import {
  claimAgentApproval,
  completeAgentApproval,
  createAgentIncident,
  createAgentRun,
  createAgentTask,
  createSourcePacket,
  decideAgentApproval,
  finishAgentRun,
  recordAgentStep,
  requestAgentApproval,
  resumeAgentApproval,
} from "@/src/agent/durable-store";
import { runControlTower } from "@/src/agent/workflows/control-tower";

export async function runPilotUAT(options: { cleanup?: boolean } = {}) {
  const shouldCleanup = options.cleanup !== false;
  const uatStartedAt = new Date().toISOString();
  const uatRunId = `uat_${crypto.randomUUID()}`;
  const uatSuffix = uatRunId.slice(-8);
  const lowRisk = await processInboundEmail({
    from: `partner1-${uatSuffix}@example.com`,
    subject: "Need media kit and pricing",
    body: "Can you share your media kit and starter package pricing?",
  });

  const highRisk = await processInboundEmail({
    from: `partner2-${uatSuffix}@example.com`,
    subject: "Contract and discount request",
    body: "We need contract guarantees and a custom 35% discount with exclusivity.",
  });

  if (highRisk.status === "pending_approval") {
    await sendThreadReply(highRisk.id, true, "Approved by UAT reviewer.");
  }

  const socialInbound = await processInboundSocialDm({
    fromHandle: "@columbus_partner",
    body: "Can we run a founding advertiser campaign and get current package pricing?",
    provider: "staged",
    providerThreadId: "dm-thread-1",
  });

  const company = await crmAdapter.upsertCompany({
    name: `Onboarding Partner LLC ${uatSuffix}`,
  });
  const contact = await crmAdapter.upsertContact({
    email: `onboarding-${uatSuffix}@example.com`,
    name: "Onboarding Partner",
    companyId: company.id,
  });
  const deal = await crmAdapter.upsertDeal({
    companyId: company.id,
    primaryContactId: contact.id,
    stage: "won",
    packageName: "Authority Spotlight",
    mrr: 3500,
    oneTimeRevenue: 1750,
    ownerRole: "sales",
  });
  const tasks = await createOnboardingTasksForDeal(deal.id);

  const sequence = await upsertSequence({
    name: "Founding Sponsor Intro",
    stopOnReply: true,
    stopOnMeetingBooked: true,
    steps: [
      {
        id: "step_1",
        order: 1,
        channel: "email",
        templateSubject: "ColumbusREMedia founding sponsor availability",
        templateBody: "We have limited founding sponsor inventory available this month.",
        waitDaysAfterPrevious: 0,
      },
      {
        id: "step_2",
        order: 2,
        channel: "social_dm",
        templateSubject: "Follow-up in DM",
        templateBody: "Sharing a quick follow-up with package recommendations.",
        waitDaysAfterPrevious: 2,
      },
    ],
  });
  const enrollment = await enrollSequence({
    sequenceId: sequence.id,
    contactId: contact.id,
    dealId: deal.id,
  });
  const sequenceExecution: "blocked_by_policy" | "executed" = "blocked_by_policy";
  if (process.env.AGENT_EXTERNAL_SENDS_ENABLED === "true") {
    throw new Error("Pilot execution requires an explicit durable approval and is not part of the default UAT path.");
  }

  const contract = await upsertContract({
    companyId: company.id,
    dealId: deal.id,
    status: "sent",
    amount: 5250,
  });
  const invoice = await upsertInvoice({
    contractId: contract.id,
    companyId: company.id,
    dealId: deal.id,
    status: "sent",
    amount: 5250,
    dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  });

  const report = await buildDailyDigest();
  const metrics = await getDashboardMetrics();

  await createAgentRun({
    id: uatRunId,
    agentName: "agent_operational_uat",
    workflowName: "preview_durable_workflow",
    version: "2026-08-30.2",
    initiatedBy: "uat:preview",
    policyVersion: "operations-v1",
  });
  await recordAgentStep({
    runId: uatRunId,
    stepName: "durable_approval_pause_resume",
    toolName: "neon.approval_lifecycle",
    input: { destination: "uat-only", email: `uat-${uatSuffix}@example.com` },
    status: "completed",
  });
  const approvalPayload = { destination: "uat-only", message: "No external delivery." };
  const approval = await requestAgentApproval({
    runId: uatRunId,
    actionClass: "external_execute",
    risk: "high",
    payload: approvalPayload,
    requiredRole: "owner",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  await decideAgentApproval(String(approval.id), "paused", "uat:reviewer", "Paused for UAT.");
  await resumeAgentApproval(String(approval.id), "uat:reviewer", "Resumed for UAT.");
  await decideAgentApproval(String(approval.id), "approved", "uat:reviewer", "Approved for isolated UAT only.");
  await claimAgentApproval(String(approval.id), approvalPayload);
  await completeAgentApproval(String(approval.id));

  const dedupeKey = `uat:internal-task:${uatRunId}`;
  const firstTask = await createAgentTask({
    kind: "uat_internal_review",
    ownerRole: "operations",
    priority: "normal",
    dedupeKey,
    payload: { runId: uatRunId },
  });
  const duplicateTask = await createAgentTask({
    kind: "uat_internal_review",
    ownerRole: "operations",
    priority: "normal",
    dedupeKey,
    payload: { runId: uatRunId },
  });
  const incident = await createAgentIncident({
    severity: "P2",
    workflow: "preview_durable_workflow",
    errorCode: "UAT_REDACTION_CHECK",
    details: { email: `uat-${uatSuffix}@example.com`, apiToken: "uat-secret-must-not-persist" },
    ownerRole: "operations",
  });
  const sourcePacket = await createSourcePacket({
    id: `uat_source_${crypto.randomUUID()}`,
    subject: "UAT source packet",
    question: "Can this packet be reviewed without publishing?",
    sourceUrls: ["https://example.com/uat-source"],
    packet: { reviewStatus: "needs_review", uat: true },
    agentRunId: uatRunId,
  });
  const controlTower = await runControlTower({ initiatedBy: "uat:preview", traceId: uatRunId });
  await finishAgentRun(uatRunId, "completed");

  const durableUat = {
    runId: uatRunId,
    approvalLifecycle: "paused_resumed_approved_executed",
    taskDedupePassed: String(firstTask.id) === String(duplicateTask.id),
    incidentRedactionPassed: !JSON.stringify(incident.details_redacted || incident).includes("uat-secret"),
    sourcePacketId: sourcePacket.id,
    controlTowerRunId: controlTower.runId,
  };

  if (shouldCleanup) {
    const sql = getDb();
    await sql`DELETE FROM agent_messages WHERE thread_id IN (${lowRisk.id}, ${highRisk.id}, ${socialInbound.id})`;
    await sql`DELETE FROM agent_threads WHERE id IN (${lowRisk.id}, ${highRisk.id}, ${socialInbound.id})`;
    await sql`DELETE FROM agent_onboarding_tasks WHERE deal_id = ${deal.id}`;
    await sql`DELETE FROM agent_invoices WHERE contract_id = ${contract.id}`;
    await sql`DELETE FROM agent_contracts WHERE id = ${contract.id}`;
    await sql`DELETE FROM agent_sequence_enrollments WHERE id = ${enrollment.id}`;
    await sql`DELETE FROM agent_sequences WHERE id = ${sequence.id}`;
    await sql`DELETE FROM agent_activities WHERE contact_id IN (${lowRisk.contactId}, ${highRisk.contactId}, ${socialInbound.contactId}, ${contact.id}) OR deal_id = ${deal.id}`;
    await sql`DELETE FROM agent_crm_tasks WHERE contact_id IN (${lowRisk.contactId}, ${highRisk.contactId}, ${socialInbound.contactId}, ${contact.id}) OR deal_id = ${deal.id}`;
    await sql`DELETE FROM agent_deal_slas WHERE deal_id = ${deal.id}`;
    await sql`DELETE FROM agent_deal_stage_history WHERE deal_id = ${deal.id}`;
    await sql`DELETE FROM agent_deals WHERE id = ${deal.id}`;
    await sql`DELETE FROM agent_contacts WHERE id IN (${lowRisk.contactId}, ${highRisk.contactId}, ${socialInbound.contactId}, ${contact.id})`;
    await sql`DELETE FROM agent_companies WHERE id = ${company.id}`;
    await sql`DELETE FROM agent_reports WHERE id = ${report.id}`;
    await sql`DELETE FROM source_packets WHERE id = ${sourcePacket.id}`;
    await sql`DELETE FROM agent_tasks
      WHERE dedupe_key = ${dedupeKey}
         OR (dedupe_key LIKE 'control-tower:%' AND created_at >= ${uatStartedAt})`;
    await sql`DELETE FROM agent_incidents WHERE id = ${incident.id}`;
    await sql`DELETE FROM agent_approvals WHERE id = ${approval.id}`;
    await sql`DELETE FROM agent_steps WHERE run_id = ${uatRunId}`;
    await sql`DELETE FROM agent_runs WHERE id IN (${uatRunId}, ${controlTower.runId})`;
  }

  return {
    ok: true,
    threadsTotal: (await listThreads()).length,
    lowRiskThreadId: lowRisk.id,
    highRiskThreadId: highRisk.id,
    socialThreadId: socialInbound.id,
    onboardingTasksCreated: tasks.length,
    contractId: contract.id,
    invoiceId: invoice.id,
    sequenceEnrollmentId: enrollment.id,
    sequenceExecution,
    dashboard: metrics,
    report,
    durableUat,
    cleanupPerformed: shouldCleanup,
  };
}
