#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

// No PII is printed; dry-run counts only. Retain suppression permanently until
// a separately approved resubscription workflow exists. Never prune verification
// evidence or records needed by a pending CRM/outbox job.
const apply=process.argv.includes('--apply');
if (apply && !process.argv.includes('--confirm=prune-intake')) throw new Error('--apply requires --confirm=prune-intake');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required (dry-run is read-only)');
const sql=neon(process.env.DATABASE_URL);
const counts=await sql`SELECT
  (SELECT count(*) FROM intake_rate_limits WHERE expires_at<NOW()) AS rate_limits,
  (SELECT count(*) FROM subscriber_preference_sessions WHERE expires_at<NOW()) AS sessions,
  (SELECT count(*) FROM public_intake WHERE status IN ('PENDING','QUARANTINED','EXPIRED')
    AND created_at<NOW()-interval '30 days' AND payload<>'{}'::jsonb) AS pending_pii`;
if (apply) await sql.transaction([
  sql`DELETE FROM intake_rate_limits WHERE expires_at<NOW()`,
  sql`DELETE FROM subscriber_preference_sessions WHERE expires_at<NOW()`,
  sql`UPDATE public_intake SET payload='{}'::jsonb,email='[expired]',status='EXPIRED'
    WHERE status IN ('PENDING','QUARANTINED','EXPIRED') AND created_at<NOW()-interval '30 days'`,
]);
console.log(JSON.stringify({mode:apply?'apply':'dry-run',counts:counts[0],suppressionRetained:true,verifiedEvidenceRetained:true}));
