import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { loadNewsroomHealth } from '@/scripts/newsroom-health-store.mjs';
import { sendTelegramAlert } from '@/scripts/telegram-alert.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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
    const report = await loadNewsroomHealth(getDb());

    const telegram = report.ok ? null : await sendTelegramAlert({
      status: 'FAILED',
      summary: `Production newsroom health failed: ${report.reasons.join(', ')}. Metrics: ${JSON.stringify(report.metrics)}`,
    });
    return NextResponse.json({ ...report, telegram }, { status: report.ok ? 200 : 503 });
  } catch {
    const message = 'NEWSROOM_HEALTH_SCHEMA_OR_DATABASE_UNAVAILABLE';
    await sendTelegramAlert({ status: 'FAILED', summary: `Production newsroom health check crashed: ${message}` });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const POST = GET;
