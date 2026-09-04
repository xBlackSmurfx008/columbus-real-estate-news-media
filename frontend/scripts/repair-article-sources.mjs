#!/usr/bin/env node
// Post-publish source repair for an article that is already live.
//
// CLAUDE.md: "Review happens post-publish: if a problem is found in a live
// article, fix or unpublish it." The site-quality `sources` check found live
// articles that cite nothing and carry no editorial_review_jobs row, because
// they were published while the pipeline was running without DATABASE_URL.
//
// This script repairs one of those in place. It takes the same submission JSON
// that scripts/publish-article.mjs takes, runs the identical deterministic
// editorial gate, and then UPDATES the existing article row and writes the
// backing ledger row. It never inserts a new article and never invents an id,
// so a repair can never fork a story into a second URL.
//
//   DATABASE_URL=... node scripts/repair-article-sources.mjs <file.json> --id <article-id>
//   DATABASE_URL=... node scripts/repair-article-sources.mjs <file.json> --id <article-id> --check
//
// --check runs the gate and prints the report without touching the database.

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { evaluateArticle, formatQualityReport } from "./editorial-quality-lib.mjs";
import { ensureEditorialReviewTable, saveEditorialReview } from "./editorial-review-store.mjs";
import { canonicalizeAuthor, isApprovedAuthor } from "./newsroom-authors.mjs";

const args = process.argv.slice(2);
const filePath = args.find((value) => !value.startsWith("--"));
const idFlag = args.indexOf("--id");
const articleId = idFlag >= 0 ? args[idFlag + 1] : null;
const checkOnly = args.includes("--check");

if (!filePath || !articleId) {
  console.error("Usage: node scripts/repair-article-sources.mjs <file.json> --id <article-id> [--check]");
  process.exit(1);
}

const article = JSON.parse(readFileSync(filePath, "utf-8"));

article.author = canonicalizeAuthor(article.author);
if (!isApprovedAuthor(article.author)) {
  console.error(`Byline "${article.author}" is not an approved author.`);
  process.exit(1);
}

const report = evaluateArticle(article);
console.log(formatQualityReport(report));
console.log(`\n${report.score}/${report.possible} checks passed.`);

if (!report.passed) {
  console.error(`\nRepair blocked: ${report.failedCodes.join(", ")}`);
  process.exit(1);
}

if (checkOnly) {
  console.log("\n--check: database untouched.");
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}
const sql = neon(databaseUrl);

const [existing] = await sql`SELECT id, canonical_slug, status FROM articles WHERE id = ${articleId}`;
if (!existing) {
  console.error(`No article with id "${articleId}". A repair never creates one.`);
  process.exit(1);
}

await ensureEditorialReviewTable(sql);

const [row] = await sql`
  UPDATE articles SET
    title = ${article.title},
    excerpt = ${article.excerpt},
    body = ${article.body},
    meta_description = ${article.meta_description},
    category = ${article.category},
    author = ${article.author},
    area_slug = ${article.area_slug ?? null},
    topic_slug = ${article.topic_slug ?? null},
    tags = ${JSON.stringify(article.tags ?? [])}::jsonb,
    read_time = ${article.read_time ?? "5 min"},
    fact_checked_at = ${article.fact_checked_at},
    updated_at = NOW()
  WHERE id = ${articleId}
  RETURNING id, canonical_slug, status
`;

await saveEditorialReview(sql, articleId, article, report);

console.log(`\nRepaired ${row.id} (status ${row.status}, slug ${row.canonical_slug}).`);
console.log("Ledger written to editorial_review_jobs.");
