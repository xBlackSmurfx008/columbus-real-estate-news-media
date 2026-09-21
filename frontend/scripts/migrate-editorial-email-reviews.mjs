#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
const sql = neon(process.env.DATABASE_URL);
await sql`
  CREATE TABLE IF NOT EXISTS editorial_email_reviews (
    article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    review_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    reply_address TEXT NOT NULL,
    candidate_hash TEXT NOT NULL,
    candidate JSONB NOT NULL,
    proposed_human_scores JSONB NOT NULL,
    outbound_email_id TEXT,
    inbound_email_id TEXT UNIQUE,
    reply_from TEXT,
    reply_text TEXT,
    reviewer TEXT,
    sent_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (article_id, version),
    CONSTRAINT editorial_email_review_status_check CHECK (
      status IN ('SENDING', 'AWAITING_REPLY', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'DELIVERY_FAILED')
    )
  )
`;
await sql`CREATE INDEX IF NOT EXISTS editorial_email_reviews_status_idx ON editorial_email_reviews(status, updated_at DESC)`;
process.stdout.write('{"ok":true,"migration":"editorial_email_reviews"}\n');
