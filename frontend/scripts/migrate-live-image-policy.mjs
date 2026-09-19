#!/usr/bin/env node
// Reconciles the `articles_live_image_required` CHECK constraint with the
// documented publication policy.
//
// Background. The original constraint (owner requirement, 2026-08-14) was:
//
//   CHECK (status <> 'live' OR (NULLIF(btrim(image_url), '') IS NOT NULL
//                               AND image_url LIKE 'https://%'))
//
// It forbade any live article from being imageless. Three things in this repo
// contradict it:
//
//   1. CLAUDE.md (owner policy, 2026-08-25, newer) states plainly that
//      "Images never block publication" and that the hero is attached "as soon
//      as possible after publish".
//   2. scripts/list-missing-images.mjs selects `status = 'live' AND image_url
//      IS NULL` as its work queue, so the durable image workflow is built on
//      the assumption that live imageless rows exist.
//   3. scripts/publish-article.mjs could therefore never publish an article
//      without image credentials: the INSERT was rejected before the
//      placeholder-card fallback could run.
//
// The relaxed constraint keeps the half of the guarantee that still matters -
// a live article may not carry a junk or relative image_url such as
// /images/heroes/<id>.webp, which only resolves after a deploy and is not a
// publication image - while allowing NULL to mean "hero pending backfill".
//
// Idempotent: safe to run repeatedly.
// Usage: DATABASE_URL=... node scripts/migrate-live-image-policy.mjs [--dry-run]

import { getSql, withRetry } from './image-job-store.mjs';

try { process.loadEnvFile?.('.env.local'); } catch { /* env may come from the caller */ }

const CONSTRAINT = 'articles_live_image_required';
const DRY_RUN = process.argv.includes('--dry-run');

const EXPECTED = "CHECK (((status <> 'live'::text) OR (image_url IS NULL) OR "
  + "((NULLIF(btrim(image_url), ''::text) IS NOT NULL) AND (image_url ~~ 'https://%'::text))))";

async function readConstraint(sql) {
  const [row] = await withRetry(() => sql`
    SELECT pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'articles'::regclass AND conname = ${CONSTRAINT}
  `);
  return row?.def ?? null;
}

async function main() {
  const sql = getSql();

  const before = await readConstraint(sql);
  console.log(`Before: ${before ?? '(constraint not present)'}`);

  if (DRY_RUN) {
    console.log('--dry-run: no changes made.');
    return;
  }

  // Count the rows the relaxation would newly permit, so the run is auditable.
  const [counts] = await withRetry(() => sql`
    SELECT
      count(*) FILTER (WHERE status = 'live') AS live,
      count(*) FILTER (WHERE status = 'live' AND image_url IS NULL) AS live_imageless,
      count(*) FILTER (WHERE status = 'live' AND image_url IS NOT NULL
                         AND image_url NOT LIKE 'https://%') AS live_bad_url
    FROM articles
  `);
  console.log(
    `Live articles: ${counts.live} (imageless: ${counts.live_imageless}, non-https image_url: ${counts.live_bad_url})`
  );

  if (Number(counts.live_bad_url) > 0) {
    console.error(
      `Refusing to migrate: ${counts.live_bad_url} live article(s) carry a non-https image_url. `
      + 'Fix those rows first - the new constraint still rejects them.'
    );
    process.exitCode = 1;
    return;
  }

  await withRetry(() => sql`ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_live_image_required`);
  await withRetry(() => sql`
    ALTER TABLE articles ADD CONSTRAINT articles_live_image_required CHECK (
      status <> 'live'
      OR image_url IS NULL
      OR (NULLIF(btrim(image_url), '') IS NOT NULL AND image_url LIKE 'https://%')
    )
  `);

  const after = await readConstraint(sql);
  console.log(`After:  ${after ?? '(constraint missing - this is a bug)'}`);

  if (!after) {
    console.error('Constraint was not re-created. Investigate before publishing.');
    process.exitCode = 1;
    return;
  }
  if (after.replace(/\s+/g, ' ') !== EXPECTED.replace(/\s+/g, ' ')) {
    console.warn('Note: constraint text differs from the expected normalization; compare the two lines above.');
  }
  console.log('OK: live articles may now be imageless; non-https image_url on a live row is still rejected.');
}

await main();
