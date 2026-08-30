import { getDb } from "@/lib/db";
import type { AgentReport } from "@/src/agent/types";

type DbRow = Record<string, unknown>;

function fromRow(row: DbRow): AgentReport {
  return {
    id: String(row.id), date: String(row.report_date), threadsHandled: Number(row.threads_handled),
    autoSent: Number(row.auto_sent), pendingApprovals: Number(row.pending_approvals), escalations: Number(row.escalations),
    syncFailures: Number(row.sync_failures), onboardingDueNext48h: Number(row.onboarding_due_next_48h), summary: String(row.summary),
    channelBreakdown: row.channel_breakdown as AgentReport["channelBreakdown"],
    outreach: row.outreach as AgentReport["outreach"],
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function saveReport(report: AgentReport): Promise<AgentReport> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO agent_reports (id, report_date, threads_handled, auto_sent, pending_approvals, escalations, sync_failures, onboarding_due_next_48h, summary, channel_breakdown, outreach, created_at)
    VALUES (${report.id}, ${report.date}, ${report.threadsHandled}, ${report.autoSent}, ${report.pendingApprovals}, ${report.escalations}, ${report.syncFailures}, ${report.onboardingDueNext48h}, ${report.summary}, ${JSON.stringify(report.channelBreakdown || null)}::jsonb, ${JSON.stringify(report.outreach || null)}::jsonb, ${report.createdAt})
    ON CONFLICT (id) DO UPDATE SET summary = EXCLUDED.summary, channel_breakdown = EXCLUDED.channel_breakdown, outreach = EXCLUDED.outreach
    RETURNING *
  `;
  return fromRow(rows[0] as DbRow);
}

export async function listReports(): Promise<AgentReport[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM agent_reports ORDER BY created_at DESC`;
  return rows.map((row) => fromRow(row as DbRow));
}
