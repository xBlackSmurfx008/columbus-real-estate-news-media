export async function ensureEditorialReviewTable(sql) {
  await sql`ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_description TEXT`;
  await sql`ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_alt TEXT`;
  await sql`ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_caption TEXT`;
  await sql`ALTER TABLE articles ADD COLUMN IF NOT EXISTS fact_checked_at TIMESTAMPTZ`;
  await sql`ALTER TABLE articles ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`
    CREATE TABLE IF NOT EXISTS editorial_review_jobs (
      article_id TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'AWAITING_HUMAN_REVIEW',
      machine_score INTEGER NOT NULL,
      machine_possible INTEGER NOT NULL,
      machine_report JSONB NOT NULL,
      submission JSONB NOT NULL,
      human_score INTEGER,
      human_scores JSONB,
      human_decision TEXT,
      reviewer TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE editorial_review_jobs ADD COLUMN IF NOT EXISTS human_scores JSONB`;
}

export async function saveEditorialReview(sql, articleId, article, report) {
  await ensureEditorialReviewTable(sql);
  await sql`
    INSERT INTO editorial_review_jobs (
      article_id, status, machine_score, machine_possible, machine_report, submission, updated_at
    ) VALUES (
      ${articleId}, 'AWAITING_HUMAN_REVIEW', ${report.score}, ${report.possible},
      ${JSON.stringify(report)}::jsonb, ${JSON.stringify(article)}::jsonb, NOW()
    )
    ON CONFLICT (article_id) DO UPDATE SET
      status = 'AWAITING_HUMAN_REVIEW',
      machine_score = EXCLUDED.machine_score,
      machine_possible = EXCLUDED.machine_possible,
      machine_report = EXCLUDED.machine_report,
      submission = EXCLUDED.submission,
      human_score = NULL,
      human_decision = NULL,
      reviewer = NULL,
      reviewed_at = NULL,
      updated_at = NOW()
  `;
}
