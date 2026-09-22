#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import { agentOperationsSchema } from './agent-operations-schema.mjs';

const args = new Set(process.argv.slice(2));
if (args.has('--check')) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    AND table_name IN ('cren_agent_jobs','cren_agent_job_events','cren_crm_outbox','cren_operations_heartbeats')`;
  const installed = rows.map(row => row.table_name);
  console.log(JSON.stringify({ ok: installed.length === 4, mode: 'check', installed }));
  if (installed.length !== 4) process.exitCode = 1;
} else if (args.has('--apply')) {
  if (!args.has('--confirm=agent-operations')) throw new Error('CONFIRMATION_REQUIRED');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
  const sql = neon(process.env.DATABASE_URL);
  await sql.transaction(agentOperationsSchema.map(statement => sql.query(statement)));
  console.log(JSON.stringify({ ok: true, mode: 'apply', statements: agentOperationsSchema.length }));
} else {
  console.log(JSON.stringify({ ok: true, mode: 'dry-run', statements: agentOperationsSchema }, null, 2));
}
