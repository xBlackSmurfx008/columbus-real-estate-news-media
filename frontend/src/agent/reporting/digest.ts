import {
  activitiesStore,
  listValues,
  nextId,
  onboardingTasksStore,
  reportsStore,
  sequenceEnrollmentsStore,
  threadsStore,
  upsert,
} from "@/src/agent/store";
import type { AgentReport, MessageThread } from "@/src/agent/types";

function isWithinNext48Hours(isoDate?: string): boolean {
  if (!isoDate) return false;
  const now = new Date().getTime();
  const target = new Date(isoDate).getTime();
  return target >= now && target <= now + 48 * 60 * 60 * 1000;
}

export function buildDailyDigest(): AgentReport {
  const threads = listValues(threadsStore);
  const pendingApprovals = threads.filter((t) => t.status === "pending_approval").length;
  const escalations = threads.filter((t) => t.status === "escalated").length;
  const autoSent = threads.filter(
    (t) => t.status === "sent" && t.approvalDecision === "auto_approved",
  ).length;
  const syncFailures = listValues(activitiesStore).filter((a) =>
    a.summary.toLowerCase().includes("sync failed"),
  ).length;
  const onboardingDueNext48h = listValues(onboardingTasksStore).filter((t) =>
    isWithinNext48Hours(t.dueAt),
  ).length;
  const channelBreakdown = {
    email: threads.filter((t) => t.channel === "email").length,
    socialDm: threads.filter((t) => t.channel === "social_dm").length,
  };
  const outreach = {
    activeEnrollments: listValues(sequenceEnrollmentsStore).filter((s) => s.status === "active").length,
    pausedEnrollments: listValues(sequenceEnrollmentsStore).filter((s) => s.status === "paused").length,
    completedEnrollments: listValues(sequenceEnrollmentsStore).filter((s) => s.status === "completed")
      .length,
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
    id: nextId("report"),
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
  return upsert(reportsStore, report);
}

export function getEscalationAlerts(): Array<{
  threadId: string;
  reason: string;
  risk: MessageThread["risk"];
}> {
  return listValues(threadsStore)
    .filter((thread) => thread.status === "escalated" || thread.risk === "high")
    .map((thread) => ({
      threadId: thread.id,
      reason: thread.approvalReason || "High-risk or escalated thread.",
      risk: thread.risk,
    }));
}

export function getReports() {
  return listValues(reportsStore);
}
