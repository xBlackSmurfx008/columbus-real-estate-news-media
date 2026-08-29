#!/usr/bin/env node
import { buildHeroPrompt, selectMissingArticles } from "./image-pipeline-lib.mjs";
import { ensureImageJobTable, getSql, withRetry } from "./image-job-store.mjs";
import { ensureEditorialReviewTable } from './editorial-review-store.mjs';

const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : 4;
const claim = process.argv.includes('--claim');
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
  LEFT JOIN article_image_jobs ON article_image_jobs.article_id = articles.id
  WHERE articles.status = 'live'
    AND (articles.image_url IS NULL OR articles.image_url LIKE '/images/heroes/%' OR articles.image_url LIKE '%/placeholder-%')
    AND (article_image_jobs.status IS NULL OR article_image_jobs.status IN ('PENDING', 'FAILED', 'READY_FOR_REVIEW'))
    AND editorial_review_jobs.machine_score = editorial_review_jobs.machine_possible
  ORDER BY articles.created_at DESC
`);
const selected = [];
const ordered = selectMissingArticles(rows, rows.length);
for (const article of ordered) {
  if (selected.length >= limit) break;
  const imagePrompt = buildHeroPrompt(article);
  if (!claim) {
    selected.push({ ...article, imagePrompt });
    continue;
  }
  const [claimed] = await withRetry(() => sql`
    INSERT INTO article_image_jobs (article_id, status, prompt, model, started_at, updated_at)
    VALUES (${article.id}, 'CLAIMED', ${imagePrompt}, 'codex-subscription-imagegen', NOW(), NOW())
    ON CONFLICT (article_id) DO UPDATE SET
      prompt = EXCLUDED.prompt,
      model = EXCLUDED.model,
      status = 'CLAIMED',
      started_at = NOW(),
      updated_at = NOW()
    WHERE article_image_jobs.status NOT IN ('CLAIMED', 'GENERATING', 'READY_FOR_REVIEW', 'APPROVED')
       OR article_image_jobs.started_at < NOW() - INTERVAL '60 minutes'
    RETURNING article_id
  `);
  if (claimed) selected.push({ ...article, imagePrompt });
}

process.stdout.write(`${JSON.stringify({
  totalMissing: rows.length,
  claimed: claim,
  missingIds: rows.map((article) => article.id),
  selected,
})}\n`);
