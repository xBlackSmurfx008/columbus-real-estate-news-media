#!/usr/bin/env node
import { ensureImageJobTable, getSql, withRetry } from "./image-job-store.mjs";

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const articleId = arg("article-id");
const errorCode = arg("code")?.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 100);
if (!articleId || !errorCode) {
  console.error("Usage: node scripts/record-image-failure.mjs --article-id <id> --code <safe-code>");
  process.exit(1);
}

const sql = getSql();
await withRetry(() => ensureImageJobTable(sql));
const [recorded] = await withRetry(() => sql`
  INSERT INTO article_image_jobs (article_id, status, attempts, last_error_code, updated_at)
  SELECT ${articleId}, 'FAILED', 1, ${errorCode}, NOW()
  FROM articles
  WHERE id = ${articleId} AND status = 'draft' AND image_url IS NULL
  ON CONFLICT (article_id) DO UPDATE SET
    status = 'FAILED',
    attempts = article_image_jobs.attempts + 1,
    last_error_code = EXCLUDED.last_error_code,
    updated_at = NOW()
  WHERE article_image_jobs.status NOT IN ('READY_FOR_REVIEW', 'APPROVED')
    AND EXISTS (
      SELECT 1 FROM articles
      WHERE id = ${articleId} AND status = 'draft' AND image_url IS NULL
    )
  RETURNING article_id
`);
process.stdout.write(`${JSON.stringify(recorded
  ? { ok: true, articleId, status: 'FAILED' }
  : { ok: true, articleId, noOp: true })}\n`);
