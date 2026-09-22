export const agentOperationsSchema = [
  `CREATE TABLE IF NOT EXISTS cren_agent_jobs (
    id UUID PRIMARY KEY, kind TEXT NOT NULL, dedupe_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','RUNNING','RETRY','COMPLETED','DEAD_LETTER','CANCELLED')),
    payload JSONB NOT NULL DEFAULT '{}', result JSONB, owner_role TEXT NOT NULL DEFAULT 'operations',
    attempts INT NOT NULL DEFAULT 0, max_attempts INT NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
    due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lease_token UUID, lease_until TIMESTAMPTZ, heartbeat_at TIMESTAMPTZ, last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS cren_agent_jobs_claim_idx ON cren_agent_jobs (kind, status, available_at, due_at)`,
  `CREATE TABLE IF NOT EXISTS cren_agent_job_events (
    id BIGSERIAL PRIMARY KEY, job_id UUID NOT NULL REFERENCES cren_agent_jobs(id), event TEXT NOT NULL,
    detail JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS cren_agent_job_events_job_idx ON cren_agent_job_events (job_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS cren_crm_outbox (
    intake_id UUID PRIMARY KEY, event_key TEXT NOT NULL UNIQUE, pipeline TEXT NOT NULL CHECK (pipeline IN ('media','acquisition')),
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','DELIVERED','BLOCKED')),
    job_id UUID NOT NULL REFERENCES cren_agent_jobs(id), payload_hash TEXT NOT NULL,
    receiver_receipt JSONB, delivered_at TIMESTAMPTZ, last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS cren_operations_heartbeats (
    id UUID PRIMARY KEY, trigger_kind TEXT NOT NULL CHECK (trigger_kind IN ('scheduled','manual')),
    status TEXT NOT NULL CHECK (status IN ('RUNNING','COMPLETED','FAILED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), finished_at TIMESTAMPTZ, summary JSONB, error_code TEXT
  )`,
];
