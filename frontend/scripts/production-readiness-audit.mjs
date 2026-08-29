#!/usr/bin/env node
// Read-only production readiness audit. It reports migration, image-policy,
// editorial-job, and controlled smoke-record gaps without mutating data.

import { neon } from "@neondatabase/serverless";
import { smokeCountQuery } from "./smoke-records-lib.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

function addFinding(findings, severity, code, message, detail = undefined) {
  findings.push({ severity, code, message, ...(detail ? { detail } : {}) });
}

async function tableSet() {
  const rows = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  return new Set(rows.map((row) => row.table_name));
}

async function hasColumn(table, column) {
  const rows = await sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
    LIMIT 1
  `;
  return rows.length > 0;
}

const tables = await tableSet();
const findings = [];
const report = {
  checkedAt: new Date().toISOString(),
  ok: true,
  requiredTables: {},
  articlePolicy: {},
  editorialJobs: {},
  marketData: {},
  audienceData: {},
  findings,
};

for (const table of [
  "articles",
  "article_slug_redirects",
  "article_image_fingerprints",
  "article_image_jobs",
  "editorial_review_jobs",
  "market_sources",
  "market_observations",
  "activation_events",
  "page_views",
  "policy_versions",
  "consent_events",
  "business_profiles",
  "apartment_profiles",
  "profile_claims",
  "profile_versions",
  "profile_credentials",
  "profile_disputes",
  "advertiser_accounts",
  "campaigns",
  "ad_assets",
  "claim_substantiation",
  "insertion_orders",
  "lead_recipients",
  "lead_routes",
  "audit_logs",
]) {
  report.requiredTables[table] = tables.has(table);
}

for (const table of ["articles", "article_slug_redirects", "article_image_fingerprints", "editorial_review_jobs"]) {
  if (!tables.has(table)) {
    addFinding(findings, "error", "CORE_TABLE_MISSING", `${table} is missing.`);
  }
}

if (!tables.has("market_sources") || !tables.has("market_observations")) {
  addFinding(
    findings,
    "error",
    "MARKET_OBSERVATION_LAYER_MISSING",
    "Source-aware market tables are not installed; area hub market snapshots remain in pending-data mode.",
  );
}

for (const table of [
  "policy_versions",
  "consent_events",
  "business_profiles",
  "apartment_profiles",
  "profile_claims",
  "profile_versions",
  "profile_credentials",
  "profile_disputes",
  "advertiser_accounts",
  "campaigns",
  "ad_assets",
  "claim_substantiation",
  "insertion_orders",
  "lead_recipients",
  "lead_routes",
  "audit_logs",
]) {
  if (!tables.has(table)) {
    addFinding(
      findings,
      "warn",
      "COMMERCIAL_READINESS_TABLE_MISSING",
      `${table} is missing; self-service profiles, versioned consent, lead routing, and advertiser workflows are not launch-ready.`,
    );
  }
}

if (tables.has("articles")) {
  const statusRows = await sql`
    SELECT status, COUNT(*)::int AS count
    FROM articles
    GROUP BY status
    ORDER BY status
  `;
  report.articlePolicy.byStatus = statusRows;

  if (await hasColumn("articles", "canonical_slug")) {
    const missingCanonical = await sql`
      SELECT id, title
      FROM articles
      WHERE status = 'live'
        AND (canonical_slug IS NULL OR canonical_slug = '')
      ORDER BY created_at DESC
      LIMIT 25
    `;
    report.articlePolicy.liveMissingCanonicalSlugs = missingCanonical;
    if (missingCanonical.length > 0) {
      addFinding(findings, "error", "LIVE_CANONICAL_SLUGS_MISSING", `${missingCanonical.length} live article(s) lack canonical_slug.`, missingCanonical);
    }
  }

  if (await hasColumn("articles", "image_url")) {
    const missingPublicImages = await sql`
      SELECT id, title
      FROM articles
      WHERE status = 'live'
        AND (image_url IS NULL OR image_url = '')
      ORDER BY created_at DESC
      LIMIT 25
    `;
    report.articlePolicy.liveMissingPublicImages = missingPublicImages;
    if (missingPublicImages.length > 0) {
      addFinding(findings, "error", "LIVE_IMAGES_MISSING", `${missingPublicImages.length} live article(s) lack image_url.`, missingPublicImages);
    }
  }
}

if (tables.has("articles") && tables.has("article_image_fingerprints")) {
  const missingFingerprints = await sql`
    SELECT articles.id, articles.title
    FROM articles
    LEFT JOIN article_image_fingerprints
      ON article_image_fingerprints.article_id = articles.id
    WHERE articles.status = 'live'
      AND articles.image_url IS NOT NULL
      AND articles.image_url <> ''
      AND article_image_fingerprints.article_id IS NULL
    ORDER BY articles.created_at DESC
    LIMIT 50
  `;
  report.articlePolicy.liveMissingImageFingerprints = missingFingerprints;
  if (missingFingerprints.length > 0) {
    addFinding(findings, "error", "LIVE_IMAGE_FINGERPRINTS_MISSING", `${missingFingerprints.length} live article image(s) are not reserved in the fingerprint table.`, missingFingerprints);
  }
}

if (tables.has("articles") && tables.has("article_image_jobs")) {
  const missingJobs = await sql`
    SELECT articles.id, articles.title
    FROM articles
    LEFT JOIN article_image_jobs
      ON article_image_jobs.article_id = articles.id
    WHERE articles.status = 'live'
      AND articles.image_url IS NOT NULL
      AND articles.image_url <> ''
      AND article_image_jobs.article_id IS NULL
    ORDER BY articles.created_at DESC
    LIMIT 50
  `;
  const incompleteJobs = await sql`
    SELECT articles.id, articles.title, article_image_jobs.status
    FROM articles
    JOIN article_image_jobs
      ON article_image_jobs.article_id = articles.id
    WHERE articles.status = 'live'
      AND articles.image_url IS NOT NULL
      AND articles.image_url <> ''
      AND UPPER(article_image_jobs.status) NOT IN ('READY_FOR_REVIEW', 'APPROVED', 'PUBLISHED', 'COMPLETED')
    ORDER BY article_image_jobs.updated_at DESC
    LIMIT 50
  `;
  report.articlePolicy.liveMissingImageJobs = missingJobs;
  report.articlePolicy.liveIncompleteImageJobs = incompleteJobs;
  if (missingJobs.length > 0) {
    addFinding(findings, "warn", "LIVE_IMAGE_JOBS_MISSING", `${missingJobs.length} live article image(s) do not have article_image_jobs rows.`, missingJobs);
  }
  if (incompleteJobs.length > 0) {
    addFinding(findings, "warn", "LIVE_IMAGE_JOBS_INCOMPLETE", `${incompleteJobs.length} live article image job(s) are not completed.`, incompleteJobs);
  }
} else if (tables.has("articles")) {
  addFinding(
    findings,
    "warn",
    "IMAGE_JOB_TABLE_MISSING",
    "article_image_jobs is missing; release checks cannot verify live image workflow coverage.",
  );
}

if (tables.has("articles") && tables.has("editorial_review_jobs")) {
  const reviewRows = await sql`
    SELECT editorial_review_jobs.status AS review_status,
           articles.status AS article_status,
           COUNT(*)::int AS count
    FROM editorial_review_jobs
    JOIN articles ON articles.id = editorial_review_jobs.article_id
    GROUP BY editorial_review_jobs.status, articles.status
    ORDER BY editorial_review_jobs.status, articles.status
  `;
  const staleRows = await sql`
    SELECT editorial_review_jobs.article_id, editorial_review_jobs.status
    FROM editorial_review_jobs
    JOIN articles ON articles.id = editorial_review_jobs.article_id
    WHERE articles.status = 'live'
      AND editorial_review_jobs.status IN ('AWAITING_HUMAN_REVIEW', 'READY_FOR_AUTOMATION')
    ORDER BY editorial_review_jobs.updated_at DESC
    LIMIT 50
  `;
  report.editorialJobs.byReviewAndArticleStatus = reviewRows;
  report.editorialJobs.liveRowsStillQueued = staleRows;
  if (staleRows.length > 0) {
    addFinding(findings, "warn", "LIVE_REVIEW_ROWS_STILL_QUEUED", `${staleRows.length} live article(s) still have queued editorial review status.`, staleRows);
  }
}

if (tables.has("market_sources")) {
  const [row] = await sql`SELECT COUNT(*)::int AS count FROM market_sources`;
  report.marketData.sources = row.count;
}
if (tables.has("market_observations")) {
  const [total] = await sql`SELECT COUNT(*)::int AS count FROM market_observations`;
  const [verified] = await sql`SELECT COUNT(*)::int AS count FROM market_observations WHERE quality_status = 'verified'`;
  const [geographies] = await sql`
    SELECT COUNT(DISTINCT geography_slug)::int AS count
    FROM market_observations
    WHERE quality_status = 'verified'
  `;
  report.marketData.observations = total.count;
  report.marketData.verifiedObservations = verified.count;
  report.marketData.verifiedGeographies = geographies.count;
}

for (const table of ["contacts", "subscribers", "leads", "members", "consent_events"]) {
  if (!tables.has(table)) continue;
  const rows = await sql.query(smokeCountQuery(table));
  report.audienceData[`${table}SmokeRows`] = rows[0].n;
}
const smokeRows = Object.entries(report.audienceData)
  .filter(([key]) => key.endsWith("SmokeRows"))
  .reduce((sum, [, count]) => sum + count, 0);
if (smokeRows > 0) {
  addFinding(findings, "warn", "CONTROLLED_SMOKE_ROWS_PRESENT", `${smokeRows} controlled smoke row(s) remain in audience tables.`);
}

report.ok = findings.every((finding) => finding.severity !== "error");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
