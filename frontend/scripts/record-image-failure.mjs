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
await withRetry(() => sql`
  INSERT INTO article_image_jobs (article_id, status, attempts, last_error_code, updated_at)
  VALUES (${articleId}, 'FAILED', 1, ${errorCode}, NOW())
  ON CONFLICT (article_id) DO UPDATE SET
    status = 'FAILED',
    attempts = article_image_jobs.attempts + 1,
    last_error_code = EXCLUDED.last_error_code,
    updated_at = NOW()
`);
process.stdout.write(`${JSON.stringify({ ok: true, articleId, status: "FAILED" })}\n`);
