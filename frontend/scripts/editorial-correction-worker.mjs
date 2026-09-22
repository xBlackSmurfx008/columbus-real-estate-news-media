#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import { createEditorialRevisionAdapter, runEditorialCorrection, sweepEditorialProofs } from '../lib/editorial-correction-worker.ts';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
const sql = neon(process.env.DATABASE_URL);
const apply = process.argv.includes('--apply');
const send = process.argv.includes('--send-proofs');
if ((apply || send) && !process.argv.includes('--confirm=editorial-worker')) throw new Error('EDITORIAL_WORKER_CONFIRMATION_REQUIRED');
if (!apply) {
  const jobs = await sql`SELECT id, article_id, version, status, attempts, error_code FROM editorial_correction_jobs
    WHERE status <> 'COMPLETED' ORDER BY created_at LIMIT 20`;
  console.log(JSON.stringify({ dryRun: true, jobs, proofs: await sweepEditorialProofs(sql, { send: false }) }));
} else {
  const revise = createEditorialRevisionAdapter({ apiKey: process.env.AI_GATEWAY_API_KEY ?? '', model: process.env.CREN_EDITORIAL_REVISION_MODEL ?? '' });
  const correction = await runEditorialCorrection(sql, { revise });
  const proofs = await sweepEditorialProofs(sql, { send });
  console.log(JSON.stringify({ correction, proofs }));
}
