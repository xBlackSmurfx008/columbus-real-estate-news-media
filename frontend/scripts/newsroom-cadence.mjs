#!/usr/bin/env node
// Read-only by default. --enqueue --confirm=local-cadence writes jobs, never sends/publishes.
import { planNewsroomCadence, enqueueNewsroomCadence } from '../lib/newsroom-cadence.ts';
const args = new Set(process.argv.slice(2));
const at = [...args].find((arg) => arg.startsWith('--at='))?.slice(5);
const now = at ? new Date(at) : new Date();
if (!args.has('--enqueue')) {
  console.log(JSON.stringify({ dryRun: true, plans: planNewsroomCadence(now) }, null, 2));
} else {
  if (!args.has('--confirm=local-cadence') || process.env.CREN_CADENCE_ENABLED !== 'true') throw new Error('CADENCE_ACTIVATION_REQUIRED');
  if (at) throw new Error('ENQUEUE_CLOCK_OVERRIDE_FORBIDDEN');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
  const { neon } = await import('@neondatabase/serverless');
  const jobs = await enqueueNewsroomCadence(neon(process.env.DATABASE_URL), now);
  console.log(JSON.stringify({ queuedOrExisting: jobs.length, ids: jobs.map((job) => job.id) }));
}
