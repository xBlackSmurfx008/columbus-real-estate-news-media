#!/usr/bin/env node
import { buildHeroPrompt, selectMissingArticles } from "./image-pipeline-lib.mjs";
import { ensureImageJobTable, getSql, withRetry } from "./image-job-store.mjs";
import { ensureEditorialReviewTable } from './editorial-review-store.mjs';

const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : 4;
if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
  console.error("INVALID_LIMIT");
  process.exit(1);
}

const sql = getSql();
await withRetry(() => ensureImageJobTable(sql));
await withRetry(() => ensureEditorialReviewTable(sql));
const rows = await withRetry(() => sql`
  SELECT
    articles.id,
    articles.title,
    articles.excerpt,
    articles.category,
    articles.area_slug,
    articles.topic_slug,
    articles.created_at,
    editorial_review_jobs.submission->'image_brief' AS image_brief,
    editorial_review_jobs.submission->'image_provenance' AS image_provenance,
    editorial_review_jobs.submission->'location'->>'name' AS location_name
  FROM articles
  JOIN editorial_review_jobs ON editorial_review_jobs.article_id = articles.id
  WHERE articles.status = 'draft'
    AND articles.image_url IS NULL
    AND editorial_review_jobs.machine_score = editorial_review_jobs.machine_possible
  ORDER BY articles.created_at DESC
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
      status = CASE
        WHEN article_image_jobs.status IN ('READY_FOR_REVIEW', 'APPROVED') THEN article_image_jobs.status
        ELSE 'PENDING'
      END,
      updated_at = NOW()
  `);
}

process.stdout.write(`${JSON.stringify({
  totalMissing: rows.length,
  missingIds: rows.map((article) => article.id),
  selected,
})}\n`);
