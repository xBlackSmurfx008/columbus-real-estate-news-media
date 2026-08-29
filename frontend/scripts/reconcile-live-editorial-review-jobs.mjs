#!/usr/bin/env node
// Reconciles editorial review job rows that are still queued even though the
// article is already live. Dry-run by default.
// Usage:
//   DATABASE_URL=... node scripts/reconcile-live-editorial-review-jobs.mjs
//   DATABASE_URL=... node scripts/reconcile-live-editorial-review-jobs.mjs --execute --confirm=live-review-reconcile

import { neon } from "@neondatabase/serverless";

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const confirmed = args.includes("--confirm=live-review-reconcile");

if (execute && !confirmed) {
  console.error("Refusing to update without --confirm=live-review-reconcile.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

const staleRows = await sql`
  SELECT
    editorial_review_jobs.article_id,
    editorial_review_jobs.status AS review_status,
    editorial_review_jobs.machine_score,
    editorial_review_jobs.machine_possible,
    editorial_review_jobs.human_decision,
    editorial_review_jobs.reviewer,
    articles.title,
    articles.status AS article_status,
    articles.image_url,
    article_image_fingerprints.sha256 AS image_sha256,
    article_image_fingerprints.perceptual_hash AS image_perceptual_hash,
    article_image_jobs.status AS image_job_status
  FROM editorial_review_jobs
  JOIN articles ON articles.id = editorial_review_jobs.article_id
  LEFT JOIN article_image_fingerprints
    ON article_image_fingerprints.article_id = articles.id
  LEFT JOIN article_image_jobs
    ON article_image_jobs.article_id = articles.id
  WHERE articles.status = 'live'
    AND editorial_review_jobs.status IN ('AWAITING_HUMAN_REVIEW', 'READY_FOR_AUTOMATION')
  ORDER BY editorial_review_jobs.updated_at DESC
`;

function eligible(row) {
  return row.article_status === "live"
    && row.machine_score === row.machine_possible
    && Boolean(row.image_url)
    && Boolean(row.image_sha256)
    && Boolean(row.image_perceptual_hash)
    && ["READY_FOR_REVIEW", "APPROVED", "PUBLISHED", "COMPLETED"].includes(String(row.image_job_status ?? "").toUpperCase());
}

const eligibleRows = staleRows.filter(eligible);
const blockedRows = staleRows.filter((row) => !eligible(row));

let updatedRows = [];
if (execute && eligibleRows.length > 0) {
  updatedRows = await sql`
    UPDATE editorial_review_jobs
    SET
      status = 'AUTO_PUBLISHED',
      human_score = NULL,
      human_scores = NULL,
      human_decision = 'NOT_REQUIRED',
      reviewer = 'production-live-review-reconcile',
      reviewed_at = COALESCE(reviewed_at, NOW()),
      updated_at = NOW()
    WHERE article_id = ANY(${eligibleRows.map((row) => row.article_id)})
      AND status IN ('AWAITING_HUMAN_REVIEW', 'READY_FOR_AUTOMATION')
    RETURNING article_id, status, reviewer, reviewed_at
  `;
}

process.stdout.write(`${JSON.stringify({
  ok: blockedRows.length === 0,
  mode: execute ? "execute" : "dry-run",
  found: staleRows.length,
  eligible: eligibleRows.length,
  blocked: blockedRows.length,
  updated: updatedRows.length,
  eligibleRows: eligibleRows.map((row) => ({
    article_id: row.article_id,
    previous_status: row.review_status,
    title: row.title,
    image_job_status: row.image_job_status,
  })),
  blockedRows: blockedRows.map((row) => ({
    article_id: row.article_id,
    previous_status: row.review_status,
    title: row.title,
    machine_score: row.machine_score,
    machine_possible: row.machine_possible,
    image_url: Boolean(row.image_url),
    image_sha256: Boolean(row.image_sha256),
    image_perceptual_hash: Boolean(row.image_perceptual_hash),
    image_job_status: row.image_job_status,
  })),
  updatedRows,
}, null, 2)}\n`);

if (blockedRows.length > 0) process.exitCode = 1;
