import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { assessNewsroomAutomationHealth } from '@/scripts/newsroom-run-policy.mjs';
import { sendTelegramAlert } from '@/scripts/telegram-alert.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function isAuthorized(request: Request): boolean {
  const authorization = request.headers.get('authorization');
  return [process.env.CRON_SECRET, process.env.NEWSROOM_CREN_TRIGGER_SECRET]
    .some((secret) => Boolean(secret) && authorization === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const sql = getDb();
    const [runSummary] = await sql`
      SELECT
        MAX(completed_at) FILTER (WHERE status = 'COMPLETED') AS last_completed_run_at,
        MIN(started_at) FILTER (WHERE status = 'RUNNING') AS oldest_running_run_at,
        COUNT(*) FILTER (WHERE status = 'RUNNING')::int AS running_runs,
        COUNT(*) FILTER (
          WHERE status = 'FAILED'
            AND completed_at > COALESCE(
              (SELECT MAX(completed_at) FROM newsroom_runs WHERE status = 'COMPLETED'),
              '-infinity'::timestamptz
            )
        )::int AS failed_runs_since_last_completion
      FROM newsroom_runs
    `;
    const [articleSummary] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_count,
        MIN(created_at) FILTER (WHERE status = 'draft') AS oldest_draft_at,
        MAX(created_at) FILTER (WHERE status = 'live') AS last_publication_at
      FROM articles
    `;
    const report = assessNewsroomAutomationHealth({
      lastCompletedRunAt: runSummary.last_completed_run_at,
      oldestRunningRunAt: runSummary.oldest_running_run_at,
      runningRuns: runSummary.running_runs,
      failedRunsSinceLastCompletion: runSummary.failed_runs_since_last_completion,
      draftCount: articleSummary.draft_count,
      oldestDraftAt: articleSummary.oldest_draft_at,
      lastPublicationAt: articleSummary.last_publication_at,
    }, {
      maxRunAgeHours: Number(process.env.CREN_MAX_RUN_AGE_HOURS ?? 36),
      maxDraftAgeHours: Number(process.env.CREN_MAX_DRAFT_AGE_HOURS ?? 24),
      maxPublicationAgeHours: Number(process.env.CREN_MAX_NO_PUBLICATION_HOURS ?? 72),
    });

    const telegram = report.ok ? null : await sendTelegramAlert({
      status: 'FAILED',
      summary: `Production newsroom health failed: ${report.reasons.join(', ')}. Metrics: ${JSON.stringify(report.metrics)}`,
    });
    return NextResponse.json({ ...report, telegram }, { status: report.ok ? 200 : 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NEWSROOM_HEALTH_FAILED';
    await sendTelegramAlert({ status: 'FAILED', summary: `Production newsroom health check crashed: ${message}` });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const POST = GET;
