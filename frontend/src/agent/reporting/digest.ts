import type { AgentReport, MessageThread } from "@/src/agent/types";
import { listThreads } from "@/src/agent/repositories/inbox";
import { crmAdapter } from "@/src/agent/integrations/crm";
import { listEnrollments } from "@/src/agent/repositories/sequences";
import { listReports, saveReport } from "@/src/agent/repositories/reports";
import { listOnboardingTasks } from "@/src/agent/repositories/onboarding";

function isWithinNext48Hours(isoDate?: string): boolean {
  if (!isoDate) return false;
  const now = new Date().getTime();
  const target = new Date(isoDate).getTime();
  return target >= now && target <= now + 48 * 60 * 60 * 1000;
}

export async function buildDailyDigest(): Promise<AgentReport> {
  const threads = await listThreads();
  const pendingApprovals = threads.filter((t) => t.status === "pending_approval").length;
  const escalations = threads.filter((t) => t.status === "escalated").length;
  const autoSent = threads.filter(
    (t) => t.status === "sent" && t.approvalDecision === "auto_approved",
  ).length;
  const syncFailures = (await crmAdapter.getSnapshot()).activities.filter((a) =>
    a.summary.toLowerCase().includes("sync failed"),
  ).length;
  const onboardingDueNext48h = (await listOnboardingTasks()).filter((t) =>
    isWithinNext48Hours(t.dueAt),
  ).length;
  const channelBreakdown = {
    email: threads.filter((t) => t.channel === "email").length,
    socialDm: threads.filter((t) => t.channel === "social_dm").length,
  };
  const enrollments = await listEnrollments();
  const outreach = {
    activeEnrollments: enrollments.filter((s) => s.status === "active").length,
    pausedEnrollments: enrollments.filter((s) => s.status === "paused").length,
    completedEnrollments: enrollments.filter((s) => s.status === "completed").length,
  };

  const summary = [
    `Threads handled: ${threads.length}`,
    `Auto-sent: ${autoSent}`,
    `Pending approvals: ${pendingApprovals}`,
    `Escalations: ${escalations}`,
    `Sync failures: ${syncFailures}`,
    `Onboarding due in 48h: ${onboardingDueNext48h}`,
    `Email threads: ${channelBreakdown.email}`,
    `Social DM threads: ${channelBreakdown.socialDm}`,
    `Active sequences: ${outreach.activeEnrollments}`,
  ].join(" | ");

  const report: AgentReport = {
    id: `report_${crypto.randomUUID()}`,
    date: new Date().toISOString().slice(0, 10),
    threadsHandled: threads.length,
    autoSent,
    pendingApprovals,
    escalations,
    syncFailures,
    onboardingDueNext48h,
    summary,
    channelBreakdown,
    outreach,
    createdAt: new Date().toISOString(),
  };
  return saveReport(report);
}

export async function getEscalationAlerts(): Promise<Array<{
  threadId: string;
  reason: string;
  risk: MessageThread["risk"];
}>> {
  return (await listThreads())
    .filter((thread) => thread.status === "escalated" || thread.risk === "high")
    .map((thread) => ({
      threadId: thread.id,
      reason: thread.approvalReason || "High-risk or escalated thread.",
      risk: thread.risk,
    }));
}

export function getReports() {
  return listReports();
}
