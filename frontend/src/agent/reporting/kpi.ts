import { activitiesStore, dealsStore } from "@/src/agent/store";
import type { DashboardMetrics } from "@/src/agent/types";

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getDashboardMetrics(): DashboardMetrics {
  const weekStart = startOfWeek().getTime();
  const activities = [...activitiesStore.values()];
  const deals = [...dealsStore.values()];
  const touchesThisWeek = activities.filter((a) => new Date(a.createdAt).getTime() >= weekStart).length;
  const discoveryCallsBooked = activities.filter((a) => a.type === "meeting_scheduled").length;
  const proposalsSent = deals.filter((d) => d.stage === "proposal_sent" || d.stage === "negotiation" || d.stage === "won").length;
  const wonCount = deals.filter((d) => d.stage === "won").length;
  const conversionRatePercent = deals.length ? Number(((wonCount / deals.length) * 100).toFixed(2)) : 0;
  const newMrr = deals.reduce((sum, d) => sum + (d.mrr || 0), 0);
  const oneTimeRevenue = deals.reduce((sum, d) => sum + (d.oneTimeRevenue || 0), 0);
  const blendedAccountValue = deals.length ? Number(((newMrr + oneTimeRevenue) / deals.length).toFixed(2)) : 0;
  const renewalPipelineCount = deals.filter((d) => d.stage === "renewal").length;

  return {
    touchesThisWeek,
    discoveryCallsBooked,
    proposalsSent,
    conversionRatePercent,
    newMrr,
    oneTimeRevenue,
    blendedAccountValue,
    renewalPipelineCount,
  };
}
