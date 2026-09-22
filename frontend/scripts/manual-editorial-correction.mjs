#!/usr/bin/env node
// Supervised exact-copy replacements; no model, no publication, no implicit proof send.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { editorialCandidateHash, loadEditorialCandidate } from '../lib/editorial-email-review.ts';
import { runEditorialCorrection, validateRevision } from '../lib/editorial-correction-worker.ts';

export function manualRevision(plan, candidate, corrections) {
  if (candidate.id !== plan.articleId || editorialCandidateHash(candidate) !== plan.baseHash) throw new Error('MANUAL_PLAN_BASE_CHANGED');
  if (!Array.isArray(plan.expectedCorrectionFirstLines) ||
    JSON.stringify(corrections.map(text => text.trim().split(/\r?\n/)[0])) !== JSON.stringify(plan.expectedCorrectionFirstLines)) {
    throw new Error('MANUAL_PLAN_CORRECTIONS_CHANGED');
  }
  if (!Array.isArray(plan.replacements) || !plan.replacements.length || !plan.explanation) throw new Error('MANUAL_PLAN_INVALID');
  const revised = structuredClone(candidate);
  for (const { field, claimId, from, to } of plan.replacements) {
    if (!['title', 'excerpt', 'body', 'answer_summary', 'meta_description', 'claim_ledger'].includes(field)) throw new Error('MANUAL_PLAN_PROTECTED_FIELD');
    const claims = field === 'claim_ledger' ? revised.claim_ledger?.filter(entry => entry.id === claimId) : null;
    if (claims && claims.length !== 1) throw new Error('MANUAL_PLAN_EXACT_CLAIM_REQUIRED');
    const target = claims ? claims[0] : revised;
    const property = claims ? 'claim' : field;
    if (!target || typeof from !== 'string' || !from || typeof to !== 'string' || from === to || typeof target[property] !== 'string') throw new Error('MANUAL_PLAN_INVALID_REPLACEMENT');
    if (target[property].split(from).length !== 2) throw new Error('MANUAL_PLAN_AMBIGUOUS_REPLACEMENT');
    target[property] = target[property].replace(from, () => to);
  }
  return { status: 'REVISED', candidate: revised, explanation: plan.explanation };
}

async function main() {
  const args = process.argv.slice(2);
  const planPath = args.find(arg => arg.startsWith('--plan='))?.slice(7);
  const apply = args.includes('--apply');
  if (!planPath || !process.env.DATABASE_URL) throw new Error('PLAN_AND_DATABASE_REQUIRED');
  if (apply && !args.includes('--confirm=manual-editorial-correction')) throw new Error('MANUAL_CONFIRMATION_REQUIRED');
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  if (!/^\d+$/.test(String(plan.jobId))) throw new Error('EXACT_JOB_REQUIRED');
  const sql = neon(process.env.DATABASE_URL);
  const [job] = await sql`SELECT article_id,base_hash,status FROM editorial_correction_jobs WHERE id=${String(plan.jobId)}::bigint`;
  if (!job || job.article_id !== plan.articleId || job.base_hash !== plan.baseHash || job.status !== 'QUEUED') throw new Error('MANUAL_JOB_NOT_READY');
  const events = await sql`SELECT e.reply_text FROM editorial_email_events e
    JOIN editorial_email_event_actions a ON a.email_id=e.email_id
    JOIN editorial_correction_jobs j ON j.article_id=e.article_id AND j.version=e.version
    WHERE j.id=${String(plan.jobId)}::bigint AND a.action='CHANGES_REQUESTED' ORDER BY e.received_at,e.email_id`;
  const base = await loadEditorialCandidate(sql, plan.articleId);
  const proposal = manualRevision(plan, base, events.map(event => event.reply_text));
  const validated = validateRevision(base, proposal);
  console.log(JSON.stringify({ dryRun: !apply, articleId: plan.articleId, jobId: plan.jobId,
    changedFields: validated.diff.map(entry => entry.field), replacements: plan.replacements,
    machineScore: validated.report.score, machinePossible: validated.report.possible, paidModelCalls: 0, sends: 0, published: 0 }));
  if (!apply) return;
  const result = await runEditorialCorrection(sql, { jobId: String(plan.jobId),
    revise: async ({ candidate, corrections }) => manualRevision(plan, candidate, corrections) });
  console.log(JSON.stringify({ processed: result.processed, jobId: result.jobId, status: result.status, error: result.error,
    changedFields: result.diff?.map(entry => entry.field), paidModelCalls: 0, sends: 0, published: 0 }));
  if (result.status !== 'READY_FOR_PROOF') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
