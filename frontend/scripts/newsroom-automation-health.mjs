#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";
import { assessNewsroomAutomationHealth } from "./newsroom-run-policy.mjs";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_NOT_CONFIGURED");
const sql = neon(process.env.DATABASE_URL);

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

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
