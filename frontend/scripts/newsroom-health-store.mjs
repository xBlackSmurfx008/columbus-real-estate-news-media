import { assessNewsroomAutomationHealth } from './newsroom-run-policy.mjs';

const safeCode = value => /^[A-Z][A-Z0-9_]{0,99}$/.test(String(value ?? '').split(':')[0])
  ? String(value).split(':')[0] : 'REVIEW_REQUIRED';

/** One read-only database snapshot. Never contacts providers, sends, claims or repairs work. */
export async function loadNewsroomHealth(sql, { now = new Date(), env = process.env } = {}) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('INVALID_HEALTH_TIME');
  const [row] = await sql`
    WITH latest_proofs AS MATERIALIZED (
      SELECT DISTINCT ON (article_id) * FROM editorial_email_reviews ORDER BY article_id, version DESC
    ), drafts AS MATERIALIZED (
      SELECT a.id,a.created_at,a.updated_at,r.status AS review_status,r.updated_at AS review_updated_at,
        p.version,p.status AS proof_status,p.created_at AS proof_created_at,p.updated_at AS proof_updated_at
      FROM articles a LEFT JOIN editorial_review_jobs r ON r.article_id=a.id
      LEFT JOIN latest_proofs p ON p.article_id=a.id WHERE a.status='draft'
    ), corrections AS MATERIALIZED (
      SELECT j.* FROM editorial_correction_jobs j JOIN drafts d ON d.id=j.article_id AND d.version=j.version
      WHERE j.status IN ('QUEUED','RUNNING','READY_FOR_PROOF','BLOCKED')
    ), lost_corrections AS MATERIALIZED (
      SELECT e.article_id,MIN(e.created_at) AS created_at FROM editorial_email_events e
      JOIN drafts d ON d.id=e.article_id AND d.version=e.version AND d.proof_status='CHANGES_REQUESTED'
      WHERE e.decision='CHANGES_REQUESTED' AND NOT EXISTS (SELECT 1 FROM editorial_correction_jobs j WHERE j.email_id=e.email_id)
      GROUP BY e.article_id
    ), actionable_drafts AS MATERIALIZED (
      SELECT * FROM drafts d WHERE d.proof_status IS DISTINCT FROM 'AWAITING_REPLY'
        OR EXISTS (SELECT 1 FROM corrections c WHERE c.article_id=d.id)
    ), images AS MATERIALIZED (
      SELECT d.id,COALESCE(j.status,'PENDING') AS status,COALESCE(j.started_at,j.updated_at,d.created_at) AS since,
        j.last_error_code FROM drafts d LEFT JOIN article_image_jobs j ON j.article_id=d.id
      WHERE d.review_status IN ('AWAITING_IMAGE','READY_FOR_AUTOMATION','AWAITING_HUMAN_REVIEW')
        OR j.status IN ('PENDING','GENERATING','BLOCKED','FAILED')
    ), proof_work AS MATERIALIZED (
      SELECT d.id,d.proof_status,CASE WHEN d.proof_status='SENDING' THEN d.proof_created_at
        ELSE COALESCE(d.review_updated_at,d.updated_at) END AS since
      FROM drafts d WHERE d.proof_status='SENDING' OR (d.review_status='READY_FOR_REVIEW'
        AND (d.version IS NULL OR EXISTS (SELECT 1 FROM corrections c WHERE c.article_id=d.id AND c.status='READY_FOR_PROOF'))
        AND NOT EXISTS (SELECT 1 FROM corrections c WHERE c.article_id=d.id AND c.status IN ('QUEUED','RUNNING','BLOCKED')))
    ), current_checks AS MATERIALIZED (
      SELECT c.*,e.article_id,a.status AS article_status FROM editorial_email_publication_checks c
      JOIN editorial_email_events e ON e.email_id=c.email_id
      JOIN latest_proofs p ON p.article_id=e.article_id AND p.version=e.version
      JOIN articles a ON a.id=e.article_id
    ), publication_pending AS MATERIALIZED (
      SELECT d.id,COALESCE(MIN(e.created_at),d.proof_updated_at) AS since FROM drafts d
      LEFT JOIN editorial_email_events e ON e.article_id=d.id AND e.version=d.version AND e.decision='APPROVED'
      WHERE (d.proof_status='APPROVED' OR e.email_id IS NOT NULL)
        AND NOT EXISTS (SELECT 1 FROM current_checks c WHERE c.article_id=d.id AND c.status='BLOCKED')
        AND NOT EXISTS (SELECT 1 FROM editorial_email_publications p WHERE p.article_id=d.id AND p.version=d.version)
      GROUP BY d.id,d.proof_updated_at
    ), latest_import AS MATERIALIZED (
      SELECT * FROM cren_cloud_import_runs ORDER BY started_at DESC,id DESC LIMIT 1
    ), latest_import_finished AS MATERIALIZED (
      SELECT * FROM cren_cloud_import_runs WHERE completed_at IS NOT NULL ORDER BY started_at DESC,id DESC LIMIT 1
    ), import_paths AS MATERIALIZED (
      SELECT DISTINCT ON (item->>'path') item->>'path' AS path,item->>'status' AS status,item->>'code' AS code
      FROM cren_cloud_import_runs r CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(r.results)='array' THEN r.results ELSE '[]'::jsonb END) item
      WHERE item->>'path' IS NOT NULL ORDER BY item->>'path',r.started_at DESC,r.id DESC
    ), publication_times AS MATERIALIZED (
      SELECT p.published_at FROM editorial_email_publications p JOIN articles a ON a.id=p.article_id WHERE a.status='live'
      UNION ALL SELECT p.published_at FROM editorial_email_reviews p JOIN articles a ON a.id=p.article_id
        WHERE a.status='live' AND p.status='PUBLISHED' AND p.published_at IS NOT NULL
    )
    SELECT jsonb_build_object(
      'lastCompletedRunAt',(SELECT MAX(completed_at) FROM newsroom_runs WHERE status='COMPLETED'),
      'oldestRunningRunAt',(SELECT MIN(started_at) FROM newsroom_runs WHERE status='RUNNING'),
      'runningRuns',(SELECT COUNT(*) FROM newsroom_runs WHERE status='RUNNING'),
      'failedRunsSinceLastCompletion',(SELECT COUNT(*) FROM newsroom_runs WHERE status='FAILED' AND completed_at >
        COALESCE((SELECT MAX(completed_at) FROM newsroom_runs WHERE status='COMPLETED'),'-infinity'::timestamptz)),
      'draftCount',(SELECT COUNT(*) FROM drafts),
      'actionableDraftCount',(SELECT COUNT(*) FROM actionable_drafts),
      'oldestDraftAt',(SELECT MIN(GREATEST(created_at,updated_at,review_updated_at,proof_updated_at)) FROM actionable_drafts),
      'lastPublicationAt',(SELECT MAX(published_at) FROM publication_times),
      'stages',jsonb_build_object(
        'imports',jsonb_build_object(
          'pending',(SELECT COUNT(*) FROM cren_cloud_import_runs WHERE status='RUNNING'),
          'oldestPendingAt',(SELECT MIN(started_at) FROM cren_cloud_import_runs WHERE status='RUNNING'),
          'blocked',(SELECT COUNT(*) FROM import_paths WHERE status='HELD'),
          'failed',(SELECT COUNT(*) FROM latest_import_finished WHERE status='FAILED'),
          'lastAttemptAt',(SELECT started_at FROM latest_import),'lastStatus',(SELECT status FROM latest_import),
          'problems',(SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM
            (SELECT path,code FROM import_paths WHERE status='HELD' ORDER BY path LIMIT 20) x)),
        'images',jsonb_build_object(
          'pending',(SELECT COUNT(*) FROM images WHERE status IN ('PENDING','GENERATING')),
          'blocked',(SELECT COUNT(*) FROM images WHERE status='BLOCKED'),
          'failed',(SELECT COUNT(*) FROM images WHERE status='FAILED'),
          'expiredLeases',(SELECT COUNT(*) FROM images WHERE status='GENERATING' AND since < ${now.toISOString()}::timestamptz-INTERVAL '10 minutes'),
          'oldestPendingAt',(SELECT MIN(since) FROM images WHERE status IN ('PENDING','GENERATING')),
          'problems',(SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM
            (SELECT id AS "articleId",last_error_code AS code FROM images WHERE status IN ('BLOCKED','FAILED') ORDER BY id LIMIT 20) x)),
        'proofs',jsonb_build_object(
          'pending',(SELECT COUNT(*) FROM proof_work),'sending',(SELECT COUNT(*) FROM proof_work WHERE proof_status='SENDING'),
          'awaitingOwner',(SELECT COUNT(*) FROM drafts WHERE proof_status='AWAITING_REPLY'),
          'oldestPendingAt',(SELECT MIN(since) FROM proof_work),
          'oldestSendingAt',(SELECT MIN(since) FROM proof_work WHERE proof_status='SENDING')),
        'corrections',jsonb_build_object(
          'pending',(SELECT COUNT(*) FROM corrections WHERE status IN ('QUEUED','RUNNING','READY_FOR_PROOF'))+(SELECT COUNT(*) FROM lost_corrections),
          'blocked',(SELECT COUNT(*) FROM corrections WHERE status='BLOCKED'),
          'readyForProof',(SELECT COUNT(*) FROM corrections WHERE status='READY_FOR_PROOF'),
          'missingJobs',(SELECT COUNT(*) FROM lost_corrections),
          'expiredLeases',(SELECT COUNT(*) FROM corrections WHERE status='RUNNING' AND (lease_until IS NULL OR lease_until < ${now.toISOString()}::timestamptz)),
          'oldestPendingAt',(SELECT MIN(since) FROM (SELECT created_at AS since FROM corrections WHERE status IN ('QUEUED','RUNNING','READY_FOR_PROOF')
            UNION ALL SELECT created_at FROM lost_corrections) p),
          'problems',(SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM
            (SELECT article_id AS "articleId",error_code AS code FROM corrections WHERE status='BLOCKED' ORDER BY id LIMIT 20) x)),
        'publication',jsonb_build_object(
          'pending',(SELECT COUNT(*) FROM publication_pending),'oldestPendingAt',(SELECT MIN(since) FROM publication_pending),
          'blocked',(SELECT COUNT(*) FROM current_checks WHERE status='BLOCKED' AND article_status='draft'),
          'bookkeepingFailures',(SELECT COUNT(*) FROM current_checks WHERE status='PUBLISHED' AND error_code IS NOT NULL AND article_status='live'),
          'problems',(SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM
            (SELECT article_id AS "articleId",error_code AS code FROM current_checks
              WHERE (status='BLOCKED' AND article_status='draft') OR (status='PUBLISHED' AND error_code IS NOT NULL AND article_status='live')
              ORDER BY checked_at DESC LIMIT 20) x))
    )) AS snapshot
  `;
  if (!row?.snapshot) throw new Error('NEWSROOM_HEALTH_SNAPSHOT_UNAVAILABLE');
  const snapshot = row.snapshot;
  snapshot.stages.imports.enabled = env.CREN_CLOUD_IMPORT_ENABLED === 'true';
  snapshot.stages.corrections.manualRequired = env.CREN_EDITORIAL_CORRECTIONS_ENABLED !== 'true'
    ? Math.max(0, snapshot.stages.corrections.pending - snapshot.stages.corrections.readyForProof) : 0;
  for (const stage of Object.values(snapshot.stages)) {
    if (stage.problems) stage.problems = stage.problems.map(problem => ({
      ...(problem.articleId ? { articleId: String(problem.articleId).slice(0, 240) } : {}),
      ...(problem.path ? { path: /^frontend\/content\/articles\/[a-z0-9-]+\.json$/.test(problem.path) ? problem.path : 'REDACTED_ARTIFACT_PATH' } : {}),
      code: safeCode(problem.code),
    }));
  }
  return assessNewsroomAutomationHealth(snapshot, {
    now, maxRunAgeHours: Number(env.CREN_MAX_RUN_AGE_HOURS ?? 36),
    maxDraftAgeHours: Number(env.CREN_MAX_DRAFT_AGE_HOURS ?? 24),
    maxPublicationAgeHours: Number(env.CREN_MAX_NO_PUBLICATION_HOURS ?? 72),
    maxStageAgeHours: Number(env.CREN_MAX_STAGE_AGE_MINUTES ?? 150) / 60,
  });
}
