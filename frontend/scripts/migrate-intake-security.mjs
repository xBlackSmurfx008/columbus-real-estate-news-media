#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import { pathToFileURL } from 'node:url';

export const statements = [
  `CREATE TABLE IF NOT EXISTS intake_rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS public_intake (
    id UUID PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('lead','contact','subscribe','member','preferences')),
    pipeline TEXT NOT NULL CHECK (pipeline IN ('media','acquisition')), email TEXT NOT NULL,
    payload JSONB NOT NULL, consent JSONB NOT NULL, dedupe_key TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VERIFIED','QUARANTINED','EXPIRED')),
    risk_reasons JSONB NOT NULL DEFAULT '[]', token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL, verified_at TIMESTAMPTZ, source_id TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'PENDING', delivery_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS public_intake_verified_idx ON public_intake(status, verified_at)`,
  `CREATE TABLE IF NOT EXISTS subscriber_suppressions (
    email TEXT PRIMARY KEY, reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS subscriber_preference_sessions (
    token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL)`,
  `INSERT INTO subscriber_suppressions (email,reason)
    SELECT DISTINCT lower(trim(email)), 'legacy-inactive' FROM subscribers WHERE status <> 'active'
    ON CONFLICT (email) DO NOTHING`,
];

export async function main() {
  const apply = process.argv.includes('--apply');
  const check = process.argv.includes('--check');
  if (!apply && !check) { console.log(JSON.stringify({ mode: 'dry-run', statements }, null, 2)); return; }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required for --check or --apply');
  const sql = neon(process.env.DATABASE_URL);
  if (check) {
    const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'
      AND table_name IN ('intake_rate_limits','public_intake','subscriber_suppressions','subscriber_preference_sessions')`;
    const present = rows.map(row => row.table_name);
    console.log(JSON.stringify({ mode: 'check', ready: present.length === 4, present }));
    if (present.length !== 4) process.exitCode = 1;
    return;
  }
  if (!process.argv.includes('--confirm=intake-security')) throw new Error('--apply requires --confirm=intake-security');
  await sql.transaction(statements.map(statement => sql.query(statement)));
  console.log('Intake security migration applied. No existing subscriber was reactivated.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
