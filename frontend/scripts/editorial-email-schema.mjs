export const editorialEmailSchema = [
  `CREATE TABLE IF NOT EXISTS editorial_email_reviews (
    article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE, version INTEGER NOT NULL,
    review_token TEXT NOT NULL UNIQUE, status TEXT NOT NULL, recipient_email TEXT NOT NULL,
    reply_address TEXT NOT NULL, candidate_hash TEXT NOT NULL, candidate JSONB NOT NULL,
    proposed_human_scores JSONB NOT NULL DEFAULT '{}', outbound_email_id TEXT,
    inbound_email_id TEXT UNIQUE, reply_from TEXT, reply_text TEXT, reviewer TEXT,
    sent_at TIMESTAMPTZ, replied_at TIMESTAMPTZ, approved_at TIMESTAMPTZ, published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(article_id, version))`,
  `CREATE INDEX IF NOT EXISTS editorial_email_reviews_status_idx ON editorial_email_reviews(status, updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS editorial_email_events (
    email_id TEXT PRIMARY KEY, webhook_id TEXT NOT NULL UNIQUE,
    article_id TEXT NOT NULL, version INTEGER NOT NULL, sender TEXT NOT NULL,
    reply_text TEXT NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('APPROVED','CHANGES_REQUESTED','EMPTY')),
    received_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY(article_id, version) REFERENCES editorial_email_reviews(article_id, version))`,
  `CREATE TABLE IF NOT EXISTS editorial_email_event_actions (
    email_id TEXT PRIMARY KEY REFERENCES editorial_email_events(email_id),
    action TEXT NOT NULL, actor TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS editorial_correction_jobs (
    id BIGSERIAL PRIMARY KEY, email_id TEXT NOT NULL UNIQUE REFERENCES editorial_email_events(email_id),
    article_id TEXT NOT NULL, version INTEGER NOT NULL, base_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','RUNNING','READY_FOR_PROOF','COMPLETED','BLOCKED','STALE')),
    attempts INTEGER NOT NULL DEFAULT 0, lease_token TEXT, lease_until TIMESTAMPTZ,
    result JSONB, diff JSONB, error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY(article_id, version) REFERENCES editorial_email_reviews(article_id, version))`,
  `CREATE INDEX IF NOT EXISTS editorial_correction_jobs_claim_idx ON editorial_correction_jobs(status, lease_until, created_at)`,
  `CREATE TABLE IF NOT EXISTS editorial_email_owner_confirmations (
    email_id TEXT PRIMARY KEY REFERENCES editorial_email_events(email_id),
    article_id TEXT NOT NULL, version INTEGER NOT NULL, candidate_hash TEXT NOT NULL,
    actor TEXT NOT NULL, reason TEXT NOT NULL CHECK(reason = 'MISCLASSIFIED_APPROVAL'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY(article_id, version) REFERENCES editorial_email_reviews(article_id, version))`,
  `CREATE TABLE IF NOT EXISTS editorial_email_publications (
    email_id TEXT PRIMARY KEY REFERENCES editorial_email_events(email_id),
    article_id TEXT NOT NULL, version INTEGER NOT NULL, candidate_hash TEXT NOT NULL,
    sender TEXT NOT NULL, authentication JSONB NOT NULL, policy_version TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), notice_email_id TEXT,
    FOREIGN KEY(article_id, version) REFERENCES editorial_email_reviews(article_id, version),
    UNIQUE(article_id, version))`,
  `CREATE TABLE IF NOT EXISTS editorial_email_publication_checks (
    email_id TEXT PRIMARY KEY REFERENCES editorial_email_events(email_id),
    status TEXT NOT NULL CHECK(status IN ('BLOCKED','PUBLISHED')),
    error_code TEXT, attempts INTEGER NOT NULL DEFAULT 1, checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS editorial_publication_fence (
    id INTEGER PRIMARY KEY CHECK(id = 1), generation BIGINT NOT NULL DEFAULT 0)`,
  `INSERT INTO editorial_publication_fence(id) VALUES (1) ON CONFLICT DO NOTHING`,
];
