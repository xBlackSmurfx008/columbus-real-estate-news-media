import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { runControlTower } from '@/src/agent/workflows/control-tower';
import { enqueueNewsroomCadence } from '@/lib/newsroom-cadence';
import vercelConfig from '@/vercel.json';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
  if (!dryRun && process.env.CREN_OPERATIONS_ENABLED !== 'true') {
    return NextResponse.json({ ok: false, error: 'OPERATIONS_DISABLED' }, { status: 503 });
  }
  try {
    // Manual authenticated probes must not satisfy the scheduled heartbeat.
    const expectedSchedule = vercelConfig.crons.find(cron => cron.path === '/api/cron/agent-control-tower')?.schedule;
    const triggerKind = expectedSchedule && request.headers.get('x-vercel-cron-schedule') === expectedSchedule
      && request.headers.get('user-agent') === 'vercel-cron/1.0' ? 'scheduled' : 'manual';
    if (!dryRun && process.env.CREN_CADENCE_ENABLED === 'true') await enqueueNewsroomCadence(getDb(), new Date());
    return NextResponse.json({ ok: true, ...await runControlTower(getDb(), { triggerKind, dryRun }) });
  } catch {
    return NextResponse.json({ ok: false, error: 'CONTROL_TOWER_FAILED' }, { status: 503 });
  }
}
