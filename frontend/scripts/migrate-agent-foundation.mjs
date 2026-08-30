#!/usr/bin/env node
// Idempotent migration for durable agent runs, approvals, tasks, incidents,
// policies, and step-level execution records.
// Usage: DATABASE_URL=... node scripts/migrate-agent-foundation.mjs

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

const tables = [
  ["agent_runs", `CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    workflow_name TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    initiated_by TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    policy_version TEXT,
    trace_id TEXT,
    error_code TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agent_runs_status_check CHECK (status IN ('queued', 'running', 'waiting_on_input', 'waiting_on_approval', 'completed', 'failed', 'blocked', 'cancelled'))
  )`],
  ["agent_steps", `CREATE TABLE IF NOT EXISTS agent_steps (
    id BIGSERIAL PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    tool_name TEXT,
    input_hash TEXT,
    input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'running',
    error_code TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agent_steps_status_check CHECK (status IN ('running', 'completed', 'failed', 'blocked'))
  )`],
  ["agent_approvals", `CREATE TABLE IF NOT EXISTS agent_approvals (
    id BIGSERIAL PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    step_id BIGINT REFERENCES agent_steps(id) ON DELETE SET NULL,
    action_class TEXT NOT NULL,
    risk TEXT NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    required_role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ,
    decided_by TEXT,
    reason TEXT,
    CONSTRAINT agent_approvals_status_check CHECK (status IN ('pending', 'approved', 'executing', 'executed', 'rejected', 'revision_requested', 'paused'))
  )`],
  ["agent_crm_tasks", `CREATE TABLE IF NOT EXISTS agent_crm_tasks (
    id BIGSERIAL PRIMARY KEY,
    kind TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'pending',
    due_at TIMESTAMPTZ,
    owner_role TEXT NOT NULL,
    dedupe_key TEXT UNIQUE NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT agent_tasks_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'blocked', 'cancelled'))
  )`],
  ["agent_policies", `CREATE TABLE IF NOT EXISTS agent_policies (
    id BIGSERIAL PRIMARY KEY,
    policy_name TEXT NOT NULL,
    version TEXT NOT NULL,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (policy_name, version)
  )`],
  ["agent_incidents", `CREATE TABLE IF NOT EXISTS agent_incidents (
    id BIGSERIAL PRIMARY KEY,
    severity TEXT NOT NULL,
    workflow TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    error_code TEXT NOT NULL,
    details_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'open',
    owner_role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT agent_incidents_severity_check CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),
    CONSTRAINT agent_incidents_status_check CHECK (status IN ('open', 'acknowledged', 'resolved', 'closed'))
  )`],
  ["source_packets", `CREATE TABLE IF NOT EXISTS source_packets (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    question TEXT,
    source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_hashes JSONB NOT NULL DEFAULT '[]'::jsonb,
    packet_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    review_status TEXT NOT NULL DEFAULT 'needs_review',
    agent_run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT source_packets_status_check CHECK (review_status IN ('needs_review', 'approved', 'rejected', 'stale'))
  )`],
  ["agent_state_records", `CREATE TABLE IF NOT EXISTS agent_state_records (
    namespace TEXT NOT NULL,
    record_id TEXT NOT NULL,
    record_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (namespace, record_id)
  )`],
  ["agent_companies", `CREATE TABLE IF NOT EXISTS agent_companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    owner_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_contacts", `CREATE TABLE IF NOT EXISTS agent_contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    title TEXT,
    company_id TEXT REFERENCES agent_companies(id) ON DELETE SET NULL,
    owner_id TEXT,
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_deals", `CREATE TABLE IF NOT EXISTS agent_deals (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES agent_companies(id) ON DELETE CASCADE,
    primary_contact_id TEXT REFERENCES agent_contacts(id) ON DELETE SET NULL,
    stage TEXT NOT NULL,
    mrr NUMERIC,
    one_time_revenue NUMERIC,
    weighted_value NUMERIC,
    package_name TEXT,
    close_date TIMESTAMPTZ,
    renewal_date TIMESTAMPTZ,
    owner_role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_deal_stage_history", `CREATE TABLE IF NOT EXISTS agent_deal_stage_history (
    id TEXT PRIMARY KEY,
    deal_id TEXT NOT NULL REFERENCES agent_deals(id) ON DELETE CASCADE,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    changed_by_role TEXT NOT NULL,
    reason TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_deal_slas", `CREATE TABLE IF NOT EXISTS agent_deal_slas (
    id TEXT PRIMARY KEY,
    deal_id TEXT NOT NULL REFERENCES agent_deals(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (deal_id, type)
  )`],
  ["agent_tasks", `CREATE TABLE IF NOT EXISTS agent_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    due_at TIMESTAMPTZ,
    assignee_role TEXT NOT NULL,
    contact_id TEXT REFERENCES agent_contacts(id) ON DELETE SET NULL,
    deal_id TEXT REFERENCES agent_deals(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_activities", `CREATE TABLE IF NOT EXISTS agent_activities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    contact_id TEXT REFERENCES agent_contacts(id) ON DELETE SET NULL,
    deal_id TEXT REFERENCES agent_deals(id) ON DELETE SET NULL,
    thread_id TEXT,
    type TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_threads", `CREATE TABLE IF NOT EXISTS agent_threads (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL REFERENCES agent_contacts(id) ON DELETE CASCADE,
    deal_id TEXT REFERENCES agent_deals(id) ON DELETE SET NULL,
    channel TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    intent TEXT NOT NULL,
    risk TEXT NOT NULL,
    confidence NUMERIC NOT NULL,
    status TEXT NOT NULL,
    draft_reply TEXT,
    source_knowledge_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    approval_decision TEXT NOT NULL,
    approval_reason TEXT,
    dm_provider TEXT,
    dm_thread_external_id TEXT,
    dm_handle TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_messages", `CREATE TABLE IF NOT EXISTS agent_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES agent_threads(id) ON DELETE CASCADE,
    contact_id TEXT NOT NULL REFERENCES agent_contacts(id) ON DELETE CASCADE,
    direction TEXT NOT NULL,
    provider_message_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_sequences", `CREATE TABLE IF NOT EXISTS agent_sequences (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stop_on_reply BOOLEAN NOT NULL,
    stop_on_meeting_booked BOOLEAN NOT NULL,
    steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_sequence_enrollments", `CREATE TABLE IF NOT EXISTS agent_sequence_enrollments (
    id TEXT PRIMARY KEY,
    sequence_id TEXT NOT NULL REFERENCES agent_sequences(id) ON DELETE CASCADE,
    contact_id TEXT NOT NULL REFERENCES agent_contacts(id) ON DELETE CASCADE,
    deal_id TEXT REFERENCES agent_deals(id) ON DELETE SET NULL,
    current_step_order INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    last_advanced_at TIMESTAMPTZ,
    stop_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_onboarding_tasks", `CREATE TABLE IF NOT EXISTS agent_onboarding_tasks (
    id TEXT PRIMARY KEY,
    deal_id TEXT NOT NULL REFERENCES agent_deals(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    due_at TIMESTAMPTZ,
    assignee TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_contracts", `CREATE TABLE IF NOT EXISTS agent_contracts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES agent_companies(id) ON DELETE CASCADE,
    deal_id TEXT NOT NULL REFERENCES agent_deals(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    starts_on DATE,
    ends_on DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_invoices", `CREATE TABLE IF NOT EXISTS agent_invoices (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES agent_contracts(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES agent_companies(id) ON DELETE CASCADE,
    deal_id TEXT NOT NULL REFERENCES agent_deals(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
  ["agent_reports", `CREATE TABLE IF NOT EXISTS agent_reports (
    id TEXT PRIMARY KEY,
    report_date DATE NOT NULL,
    threads_handled INTEGER NOT NULL,
    auto_sent INTEGER NOT NULL,
    pending_approvals INTEGER NOT NULL,
    escalations INTEGER NOT NULL,
    sync_failures INTEGER NOT NULL,
    onboarding_due_next_48h INTEGER NOT NULL,
    summary TEXT NOT NULL,
    channel_breakdown JSONB,
    outreach JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`],
];

for (const [name, ddl] of tables) {
  await sql.query(ddl);
  console.log(`ensured: table ${name}`);
}

for (const ddl of [
  "CREATE INDEX IF NOT EXISTS agent_runs_status_idx ON agent_runs(status, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS agent_runs_entity_idx ON agent_runs(entity_type, entity_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS agent_steps_run_idx ON agent_steps(run_id, created_at ASC)",
  "CREATE INDEX IF NOT EXISTS agent_approvals_pending_idx ON agent_approvals(status, expires_at)",
  "CREATE INDEX IF NOT EXISTS agent_tasks_due_idx ON agent_tasks(status, due_at)",
  "CREATE INDEX IF NOT EXISTS agent_incidents_open_idx ON agent_incidents(status, severity, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS source_packets_review_idx ON source_packets(review_status, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS agent_state_records_namespace_idx ON agent_state_records(namespace, updated_at DESC)",
  "CREATE UNIQUE INDEX IF NOT EXISTS agent_contacts_email_idx ON agent_contacts(LOWER(email))",
  "CREATE UNIQUE INDEX IF NOT EXISTS agent_companies_name_idx ON agent_companies(LOWER(name))",
  "CREATE UNIQUE INDEX IF NOT EXISTS agent_deals_identity_idx ON agent_deals(company_id, COALESCE(primary_contact_id, ''))",
  "CREATE INDEX IF NOT EXISTS agent_deals_stage_idx ON agent_deals(stage, updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS agent_activities_created_idx ON agent_activities(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS agent_threads_status_idx ON agent_threads(status, updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS agent_threads_channel_idx ON agent_threads(channel, created_at DESC)",
  "CREATE UNIQUE INDEX IF NOT EXISTS agent_messages_provider_idx ON agent_messages(provider_message_id)",
  "CREATE INDEX IF NOT EXISTS agent_sequence_enrollments_status_idx ON agent_sequence_enrollments(status, updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS agent_onboarding_tasks_due_idx ON agent_onboarding_tasks(status, due_at)",
  "CREATE INDEX IF NOT EXISTS agent_reports_date_idx ON agent_reports(report_date DESC, created_at DESC)",
]) {
  await sql.query(ddl);
}

console.log("agent foundation migration complete");
