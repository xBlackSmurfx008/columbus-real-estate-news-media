import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { runSlaSweep } from '@/lib/inquiry-sla-sweep';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scheduled SLA sweep. Runs several times through the business day (see
 * vercel.json) so a `due_soon` warning always lands before the deadline rather
 * than after it. Secret-gated like the newsroom cron; never exposes lead PII.
 */
function isAuthorized(request: Request): boolean {
  const authorization = request.headers.get('authorization');
  return [process.env.CRON_SECRET, process.env.NEWSROOM_CREN_TRIGGER_SECRET]
    .some((secret) => Boolean(secret) && authorization === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
    const result = await runSlaSweep(getDb(), { dryRun });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'SLA_SWEEP_FAILED',
    }, { status: 500 });
  }
}

export const POST = GET;
