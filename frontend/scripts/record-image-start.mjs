#!/usr/bin/env node
import { IMAGE_MODEL } from './image-pipeline-lib.mjs';
import { ensureImageJobTable, getSql, withRetry } from './image-job-store.mjs';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const articleId = arg('article-id');
if (!articleId || !/^[a-z0-9-]+$/.test(articleId)) {
  console.error('Usage: node scripts/record-image-start.mjs --article-id <id>');
  process.exit(1);
}

const sql = getSql();
await withRetry(() => ensureImageJobTable(sql));
const [started] = await withRetry(() => sql`
  INSERT INTO article_image_jobs (article_id, status, model, attempts, started_at, updated_at)
  SELECT ${articleId}, 'GENERATING', ${IMAGE_MODEL}, 1, NOW(), NOW()
  FROM articles
  WHERE id = ${articleId} AND status = 'live' AND (image_url IS NULL OR image_url LIKE '/images/heroes/%' OR image_url LIKE '%/placeholder-%')
  ON CONFLICT (article_id) DO UPDATE SET
    status = 'GENERATING',
    model = EXCLUDED.model,
    attempts = article_image_jobs.attempts + 1,
    last_error_code = NULL,
    started_at = NOW(),
    updated_at = NOW()
  WHERE EXISTS (
    SELECT 1 FROM articles
    WHERE id = ${articleId} AND status = 'live' AND (image_url IS NULL OR image_url LIKE '/images/heroes/%' OR image_url LIKE '%/placeholder-%')
  )
    AND article_image_jobs.status NOT IN ('READY_FOR_REVIEW', 'APPROVED')
  RETURNING article_id
`);
process.stdout.write(`${JSON.stringify(started
  ? { ok: true, articleId, status: 'GENERATING' }
  : { ok: true, articleId, noOp: true })}\n`);
