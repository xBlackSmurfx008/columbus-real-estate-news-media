#!/usr/bin/env node
// Adds immutable public slugs and durable historical redirects.
// Safe to rerun. Run before deploying code that selects canonical_slug.

import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

function generateArticleSlug(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

function uniqueSlug(base, articleId, used) {
  if (!used.has(base)) return base;
  const suffix = String(articleId).replace(/[^a-z0-9]/gi, '').toLowerCase().slice(-8) || 'article';
  const candidate = `${base.slice(0, Math.max(1, 79 - suffix.length))}-${suffix}`;
  if (!used.has(candidate)) return candidate;
  let counter = 2;
  while (used.has(`${candidate.slice(0, 77)}-${counter}`)) counter += 1;
  return `${candidate.slice(0, 77)}-${counter}`;
}

const originalSeedTitles = new Map([
  ['a1', "Columbus Inventory Climbs 14.2%: Is the Seller's Market Finally Over?"],
  ['a2', "Franklinton's $365M Transformation: A Neighborhood-by-Neighborhood Guide"],
  ['a3', "German Village at $635K: Inside Columbus's Most Expensive Zip Code"],
  ['a4', "Intel's 5-Year Delay: What It Really Means for Licking County Land Values"],
  ['a5', "6,700 New Apartments Hit Columbus: Where Rents Are Falling — and Where They're Not"],
  ['a6', 'Class A Office Absorbs 395K SF While B/C Bleeds: The Two-Market Reality'],
]);

function historicalSlugs(article) {
  const candidates = [];
  // Newsroom IDs created before immutable slugs contain the prior 80-character
  // title slug after their YYYY-MM-DD prefix. This recovers repaired headlines.
  if (/^\d{4}-\d{2}-\d{2}-.+/.test(article.id)) candidates.push(article.id.slice(11));
  const seedTitle = originalSeedTitles.get(article.id);
  if (seedTitle) candidates.push(generateArticleSlug(seedTitle));
  return [...new Set(candidates.filter(Boolean))];
}

const sql = neon(databaseUrl);

await sql`ALTER TABLE articles ADD COLUMN IF NOT EXISTS canonical_slug TEXT`;
await sql`
  CREATE TABLE IF NOT EXISTS article_slug_redirects (
    slug TEXT PRIMARY KEY,
    article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL DEFAULT 'headline-change',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const articles = await sql`
  SELECT id, title, canonical_slug
  FROM articles
  ORDER BY created_at ASC, id ASC
`;
const used = new Set(articles.map((article) => article.canonical_slug).filter(Boolean));
let backfilled = 0;
let redirects = 0;

for (const article of articles) {
  const titleSlug = generateArticleSlug(article.title) || `article-${article.id}`;
  let canonicalSlug = article.canonical_slug;
  if (!canonicalSlug) {
    canonicalSlug = uniqueSlug(titleSlug, article.id, used);
    await sql`
      UPDATE articles
      SET canonical_slug = ${canonicalSlug}
      WHERE id = ${article.id} AND canonical_slug IS NULL
    `;
    used.add(canonicalSlug);
    backfilled += 1;
  }

  const redirectCandidates = titleSlug === canonicalSlug
    ? historicalSlugs(article)
    : [titleSlug, ...historicalSlugs(article)];
  for (const historicalSlug of redirectCandidates) {
    if (historicalSlug === canonicalSlug || used.has(historicalSlug)) continue;
    const inserted = await sql`
      INSERT INTO article_slug_redirects (slug, article_id, reason)
      VALUES (${historicalSlug}, ${article.id}, 'pre-migration-headline')
      ON CONFLICT (slug) DO NOTHING
      RETURNING slug
    `;
    redirects += inserted.length;
  }
}

await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS articles_canonical_slug_unique
  ON articles (canonical_slug)
  WHERE canonical_slug IS NOT NULL
`;
await sql`
  CREATE INDEX IF NOT EXISTS article_slug_redirects_article_id_idx
  ON article_slug_redirects (article_id)
`;

console.log(`Article routing ready: ${backfilled} canonical slugs backfilled; ${redirects} redirects added.`);
