import { randomUUID } from 'node:crypto';

export type SqlClient = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;
export type AgentJob = Record<string, unknown> & {
  id: string; kind: string; dedupe_key: string; status: string; payload: Record<string, unknown>;
  attempts: number; max_attempts: number; lease_token: string | null;
};

function bounded(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) throw new Error('INVALID_JOB_LIMIT');
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function retryDelaySeconds(attempt: number) {
  return Math.min(3600, 30 * 2 ** Math.max(0, Math.min(10, attempt - 1)));
}

/** Callers must use stable, versioned dedupe keys; enqueue never resets completed work. */
export async function enqueueAgentJob(sql: SqlClient, input: {
  kind: string; dedupeKey: string; payload?: Record<string, unknown>; dueAt?: string;
  ownerRole?: string; maxAttempts?: number;
}): Promise<AgentJob> {
  if (!/^[a-z][a-z0-9_.-]{1,99}$/.test(input.kind) || !input.dedupeKey || input.dedupeKey.length > 240) {
    throw new Error('INVALID_AGENT_JOB');
  }
  const payload = JSON.stringify(input.payload ?? {});
  if (Buffer.byteLength(payload) > 32_768) throw new Error('JOB_PAYLOAD_TOO_LARGE');
  if (input.dueAt && !Number.isFinite(Date.parse(input.dueAt))) throw new Error('INVALID_DUE_DATE');
  const rows = await sql`
    INSERT INTO cren_agent_jobs (id, kind, dedupe_key, payload, due_at, owner_role, max_attempts)
    VALUES (${randomUUID()}, ${input.kind}, ${input.dedupeKey}, ${payload}::jsonb,
      COALESCE(${input.dueAt ?? null}::timestamptz, NOW()), ${input.ownerRole ?? 'operations'}, ${bounded(input.maxAttempts ?? 5, 1, 10)})
    ON CONFLICT (dedupe_key) DO UPDATE SET dedupe_key = EXCLUDED.dedupe_key
    RETURNING *
  `;
  const job = rows[0] as AgentJob;
  if (job.kind !== input.kind || JSON.stringify(sortJson(job.payload)) !== JSON.stringify(sortJson(input.payload ?? {}))) {
    throw new Error('JOB_DEDUPE_PAYLOAD_CONFLICT');
  }
  return job;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortJson(v)]));
  return value;
}

/** Reclaim expired leases after a worker restart; every claim has a fresh fencing token. */
export async function claimAgentJob(sql: SqlClient, input: { kinds: string[]; leaseSeconds?: number }): Promise<AgentJob | null> {
  if (!input.kinds.length || input.kinds.length > 30) throw new Error('JOB_KINDS_REQUIRED');
  await sql`
    WITH exhausted AS (
      UPDATE cren_agent_jobs SET status = 'DEAD_LETTER', lease_token = NULL, lease_until = NULL,
        last_error = 'LEASE_EXHAUSTED', updated_at = NOW()
      WHERE kind = ANY(${input.kinds}::text[]) AND status = 'RUNNING' AND lease_until <= NOW() AND attempts >= max_attempts
      RETURNING id
    ) INSERT INTO cren_agent_job_events (job_id, event, detail)
      SELECT id, 'DEAD_LETTER', '{"code":"LEASE_EXHAUSTED"}'::jsonb FROM exhausted
  `;
  const rows = await sql`
    WITH candidate AS (
      SELECT id FROM cren_agent_jobs
      WHERE kind = ANY(${input.kinds}::text[]) AND attempts < max_attempts AND due_at <= NOW()
        AND ((status IN ('QUEUED','RETRY') AND available_at <= NOW()) OR (status = 'RUNNING' AND lease_until <= NOW()))
      ORDER BY due_at, created_at FOR UPDATE SKIP LOCKED LIMIT 1
    ), claimed AS (
      UPDATE cren_agent_jobs j SET status = 'RUNNING', attempts = attempts + 1,
        lease_token = ${randomUUID()}, lease_until = NOW() + ${bounded(input.leaseSeconds ?? 120, 15, 900)} * INTERVAL '1 second',
        heartbeat_at = NOW(), updated_at = NOW()
      FROM candidate WHERE j.id = candidate.id RETURNING j.*
    ), event AS (
      INSERT INTO cren_agent_job_events (job_id, event, detail)
      SELECT id, 'CLAIMED', jsonb_build_object('attempt', attempts) FROM claimed RETURNING job_id
    ) SELECT claimed.* FROM claimed JOIN event ON event.job_id = claimed.id
  `;
  return (rows[0] as AgentJob) ?? null;
}

export async function heartbeatAgentJob(sql: SqlClient, id: string, leaseToken: string, leaseSeconds = 120) {
  const rows = await sql`
    UPDATE cren_agent_jobs SET heartbeat_at = NOW(), lease_until = NOW() + ${bounded(leaseSeconds, 15, 900)} * INTERVAL '1 second'
    WHERE id = ${id} AND lease_token = ${leaseToken} AND status = 'RUNNING' AND lease_until > NOW() RETURNING id
  `;
  if (!rows[0]) throw new Error('JOB_LEASE_LOST');
}

export async function completeAgentJob(sql: SqlClient, id: string, leaseToken: string, result: Record<string, unknown>) {
  const serialized = JSON.stringify(result);
  if (Buffer.byteLength(serialized) > 32_768) throw new Error('JOB_RESULT_TOO_LARGE');
  const rows = await sql`
    WITH finished AS (
      UPDATE cren_agent_jobs SET status = 'COMPLETED', result = ${serialized}::jsonb,
        lease_token = NULL, lease_until = NULL, completed_at = NOW(), updated_at = NOW(), last_error = NULL
      WHERE id = ${id} AND lease_token = ${leaseToken} AND status = 'RUNNING' AND lease_until > NOW() RETURNING id
    ) INSERT INTO cren_agent_job_events (job_id, event) SELECT id, 'COMPLETED' FROM finished RETURNING job_id
  `;
  if (!rows[0]) throw new Error('JOB_LEASE_LOST');
}

export async function failAgentJob(sql: SqlClient, id: string, leaseToken: string, errorCode: string, retryable = true) {
  // Store only controlled error codes: upstream response bodies may contain PII or credentials.
  const code = /^[A-Z0-9_]{1,100}$/.test(errorCode) ? errorCode : 'JOB_FAILED';
  const rows = await sql`
    WITH failed AS (
      UPDATE cren_agent_jobs SET status = CASE WHEN ${retryable} AND attempts < max_attempts THEN 'RETRY' ELSE 'DEAD_LETTER' END,
        available_at = NOW() + LEAST(3600, 30 * POWER(2, GREATEST(0, attempts - 1))) * INTERVAL '1 second',
        lease_token = NULL, lease_until = NULL, last_error = ${code}, updated_at = NOW()
      WHERE id = ${id} AND lease_token = ${leaseToken} AND status = 'RUNNING' AND lease_until > NOW() RETURNING id, status
    ) INSERT INTO cren_agent_job_events (job_id, event, detail)
      SELECT id, status, jsonb_build_object('code', ${code}::text) FROM failed RETURNING job_id
  `;
  if (!rows[0]) throw new Error('JOB_LEASE_LOST');
}
