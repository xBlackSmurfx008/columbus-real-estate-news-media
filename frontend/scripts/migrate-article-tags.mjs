#!/usr/bin/env node
import { getSql, withRetry } from './image-job-store.mjs';

try { process.loadEnvFile?.('.env.local'); } catch { /* env may come from the caller */ }

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function deriveArticleTags(article) {
  const tags = ['columbus-ohio', 'central-ohio-real-estate'];
  if (article.topic_slug) tags.push(article.topic_slug);
  if (article.area_slug && article.area_slug !== 'columbus-citywide') tags.push(article.area_slug);
  if (article.category === 'Development') tags.push('development');
  if (article.category === 'Neighborhoods') tags.push('neighborhood', 'residential');
  if (!article.topic_slug && article.category) tags.push(slugify(article.category));
  return [...new Set(tags)].slice(0, 7);
}

async function main() {
  const sql = getSql();
  await withRetry(() => sql`
    ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
  const rows = await withRetry(() => sql`
    SELECT id, category, area_slug, topic_slug, tags
    FROM articles
    ORDER BY created_at ASC
  `);

  let updated = 0;
  for (const row of rows) {
    const nextTags = deriveArticleTags(row);
    if (JSON.stringify(row.tags ?? []) === JSON.stringify(nextTags)) continue;
    await withRetry(() => sql`
      UPDATE articles
      SET tags = ${JSON.stringify(nextTags)}::jsonb, updated_at = NOW()
      WHERE id = ${row.id}
    `);
    updated += 1;
  }

  process.stdout.write(`${JSON.stringify({ ok: true, scanned: rows.length, updated })}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 1;
  });
}
