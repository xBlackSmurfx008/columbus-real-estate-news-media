#!/usr/bin/env node
import { buildHeroPrompt, selectMissingArticles } from "./image-pipeline-lib.mjs";
import { ensureImageJobTable, getSql, withRetry } from "./image-job-store.mjs";

const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : 4;
if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
  console.error("INVALID_LIMIT");
  process.exit(1);
}

const sql = getSql();
await withRetry(() => ensureImageJobTable(sql));
const rows = await withRetry(() => sql`
  SELECT id, title, excerpt, category, area_slug, topic_slug, created_at
  FROM articles
  WHERE status = 'live' AND image_url IS NULL
  ORDER BY created_at DESC
`);
const selected = selectMissingArticles(rows, limit).map((article) => ({
  ...article,
  imagePrompt: buildHeroPrompt(article),
}));

for (const article of selected) {
  await withRetry(() => sql`
    INSERT INTO article_image_jobs (article_id, status, prompt, model, updated_at)
    VALUES (${article.id}, 'PENDING', ${article.imagePrompt}, 'codex-subscription-imagegen', NOW())
    ON CONFLICT (article_id) DO UPDATE SET
      prompt = EXCLUDED.prompt,
      model = EXCLUDED.model,
      status = CASE WHEN article_image_jobs.status = 'COMPLETED' THEN article_image_jobs.status ELSE 'PENDING' END,
      updated_at = NOW()
  `);
}

process.stdout.write(`${JSON.stringify({
  totalMissing: rows.length,
  missingIds: rows.map((article) => article.id),
  selected,
})}\n`);
