import { randomUUID } from "node:crypto";

export async function ensureNewsroomRunTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS newsroom_runs (
      run_id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      story_result TEXT,
      staged_count INTEGER NOT NULL DEFAULT 0,
      image_ready_count INTEGER NOT NULL DEFAULT 0,
      published_count INTEGER NOT NULL DEFAULT 0,
      staged_article_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      blocking_reason TEXT,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS newsroom_runs_started_at_idx
    ON newsroom_runs(started_at DESC)
  `;
}

export async function startNewsroomRun(sql, { runId = randomUUID(), source = "claude-cloud", details = {} } = {}) {
  await ensureNewsroomRunTable(sql);
  const [run] = await sql`
    INSERT INTO newsroom_runs (run_id, source, status, details)
    VALUES (${runId}, ${source}, 'RUNNING', ${JSON.stringify(details)}::jsonb)
    ON CONFLICT (run_id) DO UPDATE SET
      updated_at = NOW()
    WHERE newsroom_runs.status = 'RUNNING'
      AND newsroom_runs.source = EXCLUDED.source
    RETURNING run_id, source, status, started_at
  `;
  if (!run) throw new Error("NEWSROOM_RUN_ALREADY_FINISHED");
  return run;
}

export async function assertNewsroomRunRunning(sql, runId) {
  await ensureNewsroomRunTable(sql);
  const [run] = await sql`
    SELECT run_id, source, status, started_at
    FROM newsroom_runs
    WHERE run_id = ${runId} AND status = 'RUNNING'
  `;
  if (!run) throw new Error("NEWSROOM_RUN_NOT_RUNNING");
  return run;
}

export async function recordRunStagedArticle(sql, runId, articleId) {
  await ensureNewsroomRunTable(sql);
  const [run] = await sql`
    UPDATE newsroom_runs SET
      staged_count = staged_count + CASE WHEN staged_article_ids ? ${articleId} THEN 0 ELSE 1 END,
      staged_article_ids = CASE
        WHEN staged_article_ids ? ${articleId} THEN staged_article_ids
        ELSE staged_article_ids || jsonb_build_array(${articleId}::text)
      END,
      story_result = 'STAGED',
      updated_at = NOW()
    WHERE run_id = ${runId} AND status = 'RUNNING'
    RETURNING run_id, status, staged_count, staged_article_ids
  `;
  if (!run) throw new Error("NEWSROOM_RUN_NOT_RUNNING");
  return run;
}

export async function completeNewsroomRun(sql, runId, { storyResult, details = {} } = {}) {
  await ensureNewsroomRunTable(sql);
  const [current] = await sql`
    SELECT run_id, status, staged_count
    FROM newsroom_runs
    WHERE run_id = ${runId}
  `;
  if (!current || current.status !== 'RUNNING') throw new Error("NEWSROOM_RUN_NOT_RUNNING");
  const nextResult = storyResult ?? (current.staged_count > 0 ? 'STAGED' : 'NO_QUALIFYING_STORY');
  if (!['STAGED', 'NO_QUALIFYING_STORY'].includes(nextResult)) throw new Error("INVALID_STORY_RESULT");
  if (nextResult === 'STAGED' && current.staged_count < 1) throw new Error("STAGED_RUN_HAS_NO_DRAFTS");
  if (nextResult === 'NO_QUALIFYING_STORY' && current.staged_count > 0) throw new Error("NO_STORY_RUN_HAS_DRAFTS");
  const [run] = await sql`
    UPDATE newsroom_runs SET
      status = 'COMPLETED',
      story_result = ${nextResult},
      details = details || ${JSON.stringify(details)}::jsonb,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE run_id = ${runId} AND status = 'RUNNING'
    RETURNING *
  `;
  if (!run) throw new Error("NEWSROOM_RUN_NOT_RUNNING");
  return run;
}

export async function recordRunFailure(sql, runId, reason, details = {}) {
  await ensureNewsroomRunTable(sql);
  const [run] = await sql`
    UPDATE newsroom_runs SET
      status = 'FAILED',
      blocking_reason = ${String(reason).slice(0, 1000)},
      details = details || ${JSON.stringify(details)}::jsonb,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE run_id = ${runId} AND status = 'RUNNING'
    RETURNING *
  `;
  return run ?? null;
}
