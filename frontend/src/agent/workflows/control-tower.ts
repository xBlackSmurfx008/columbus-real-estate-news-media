import { randomUUID } from 'node:crypto';
import { claimAgentJob, completeAgentJob, failAgentJob, type SqlClient } from '../repositories/jobs.ts';
import { crmConfiguration, processCrmOutbox, reconcileVerifiedCrmIntakes, verifiedIntakeSummary } from '../../../lib/crm-sync.ts';
import { enqueueInquiry } from '../../../lib/inquiry-queue-db.ts';
import { inquiryTypeForContact, inquiryTypeForPersona } from '../../../lib/inquiry-queue.ts';
import { loadNewsroomHealth } from '../../../scripts/newsroom-health-store.mjs';

export async function getControlTowerSnapshot(sql: SqlClient) {
  const [jobs, outbox, heartbeat, latest, counts, intake, newsroomHealth] = await Promise.all([
    sql`SELECT kind, status, COUNT(*)::int AS count FROM cren_agent_jobs GROUP BY kind, status ORDER BY kind, status`,
    sql`SELECT pipeline, status, COUNT(*)::int AS count FROM cren_crm_outbox GROUP BY pipeline, status ORDER BY pipeline, status`,
    sql`SELECT trigger_kind, MAX(finished_at) FILTER (WHERE status = 'COMPLETED') AS last_success,
      MAX(started_at) AS last_attempt FROM cren_operations_heartbeats GROUP BY trigger_kind`,
    sql`SELECT id, kind, status, owner_role, attempts, max_attempts, due_at, lease_until, last_error, created_at, completed_at,
      CASE WHEN kind = 'operations.scheduled_review' THEN result ELSE NULL END AS review_report
      FROM cren_agent_jobs ORDER BY created_at DESC LIMIT 50`,
    sql`SELECT COUNT(*) FILTER (WHERE status = 'DEAD_LETTER')::int AS dead_letters,
      COUNT(*) FILTER (WHERE status = 'RUNNING' AND lease_until <= NOW())::int AS expired_leases,
      COUNT(*) FILTER (WHERE status IN ('QUEUED','RETRY') AND due_at < NOW() - INTERVAL '1 day')::int AS overdue_jobs
      FROM cren_agent_jobs`,
    sql`SELECT pipeline, status, COUNT(*)::int AS count FROM public_intake GROUP BY pipeline, status ORDER BY pipeline, status`,
    loadNewsroomHealth(sql),
  ]);
  const scheduled = heartbeat.find(row => row.trigger_kind === 'scheduled');
  const age = scheduled?.last_success ? Date.now() - new Date(String(scheduled.last_success)).getTime() : Infinity;
  const configuredAge = Number(process.env.CREN_OPERATIONS_MAX_AGE_MINUTES ?? 150);
  const maxAgeMinutes = Number.isFinite(configuredAge) ? Math.max(30, Math.min(1440, configuredAge)) : 150;
  return { jobs, outbox, heartbeat, intake, newsroomHealth, latestJobs: latest, counts: counts[0],
    scheduledHeartbeatHealthy: age >= 0 && age < maxAgeMinutes * 60_000, maxAgeMinutes,
    crm: { enabled: crmConfiguration().enabled, reason: crmConfiguration().reason, acquisition: 'BLOCKED_RECEIVER_SEPARATION_REQUIRED' },
    legacyPilot: 'DISABLED_IN_PRODUCTION', externalMarketing: 'DISABLED' };
}

/** Reconstruct the staffed queue only from confirmed intake; never send notifications here. */
async function reconcileVerifiedInquiryQueue(sql: SqlClient) {
  const rows = await sql`SELECT i.* FROM public_intake i LEFT JOIN inquiry_queue q
    ON q.source_table = CASE WHEN i.kind = 'lead' THEN 'leads' ELSE 'contacts' END AND q.source_id = i.source_id
    WHERE i.status = 'VERIFIED' AND i.source_id IS NOT NULL AND i.kind IN ('lead','contact')
      AND i.consent->>'inquiryResponse' = 'true' AND q.id IS NULL
    ORDER BY i.verified_at LIMIT 50`;
  for (const row of rows) {
    const payload = row.payload as Record<string, unknown>;
    // Existing queue API needs .query only for unrelated list operations; enqueue uses tagged SQL.
    await enqueueInquiry(sql as Parameters<typeof enqueueInquiry>[0], {
      sourceTable: row.kind === 'lead' ? 'leads' : 'contacts', sourceId: String(row.source_id),
      inquiryType: row.kind === 'lead' ? inquiryTypeForPersona(String(payload.persona ?? ''))
        : inquiryTypeForContact(String(payload.source ?? ''), String(payload.inquiryType ?? '')),
      persona: String(payload.persona ?? ''), email: String(row.email), name: String(payload.name ?? ''),
      phone: String(payload.phone ?? ''), area: String(payload.area ?? ''), source: `verified-intake:${row.pipeline}`,
      sourceRoute: String(payload.sourceRoute ?? ''), summary: verifiedIntakeSummary(payload),
      receivedAt: new Date(String(row.verified_at)), isTest: false,
    });
  }
  return { enqueued: rows.length, notificationsSent: 0 };
}

export async function processScheduledOperationalReviews(sql: SqlClient, { limit = 5 }: { limit?: number } = {}) {
  let completed = 0;
  for (let index = 0; index < Math.min(10, Math.max(0, limit)); index++) {
    const job = await claimAgentJob(sql, { kinds: ['operations.scheduled_review'], leaseSeconds: 60 });
    if (!job) break;
    try {
      const snapshot = await getControlTowerSnapshot(sql);
      await completeAgentJob(sql, job.id, String(job.lease_token), {
        reviewOnly: true, externalActionsTaken: false, plannedTasks: job.payload,
        counts: snapshot.counts, crm: snapshot.crm, scheduledHeartbeatHealthy: snapshot.scheduledHeartbeatHealthy,
        newsroomHealth: snapshot.newsroomHealth,
        notice: 'Operations review prepared. Planned reporting, publishing, newsletter and outreach tasks are not performed by this job.',
      });
      completed++;
    } catch {
      await failAgentJob(sql, job.id, String(job.lease_token), 'OPERATIONS_REVIEW_FAILED');
    }
  }
  return { completed, externalActionsTaken: false };
}

export async function runControlTower(sql: SqlClient, input: { triggerKind: 'scheduled' | 'manual'; dryRun?: boolean }) {
  if (input.dryRun) return { dryRun: true, snapshot: await getControlTowerSnapshot(sql) };
  const runId = randomUUID();
  await sql`INSERT INTO cren_operations_heartbeats (id, trigger_kind, status) VALUES (${runId}, ${input.triggerKind}, 'RUNNING')`;
  try {
    const reconciliation = await reconcileVerifiedCrmIntakes(sql);
    const inquiryQueue = await reconcileVerifiedInquiryQueue(sql);
    const crm = await processCrmOutbox(sql);
    const reviews = await processScheduledOperationalReviews(sql);
    const summary = { reconciliation, inquiryQueue, crm, reviews };
    await sql`UPDATE cren_operations_heartbeats SET status = 'COMPLETED', finished_at = NOW(), summary = ${JSON.stringify(summary)}::jsonb WHERE id = ${runId}`;
    return { runId, ...summary, snapshot: await getControlTowerSnapshot(sql) };
  } catch {
    await sql`UPDATE cren_operations_heartbeats SET status = 'FAILED', finished_at = NOW(), error_code = 'CONTROL_TOWER_FAILED' WHERE id = ${runId}`;
    throw new Error('CONTROL_TOWER_FAILED');
  }
}
