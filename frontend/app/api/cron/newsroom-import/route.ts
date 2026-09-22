import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { readCloudDrafts } from '@/scripts/cloud-draft-source.mjs';
import { runCloudImport } from '@/scripts/cloud-draft-import.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
  if (!dryRun && process.env.CREN_CLOUD_IMPORT_ENABLED !== 'true') {
    return NextResponse.json({ ok: false, error: 'CLOUD_IMPORT_DISABLED' }, { status: 503 });
  }
  try {
    const now = new Date();
    const result = await runCloudImport(getDb(), () => readCloudDrafts({ now }), { now, apply: !dryRun });
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false, error: 'CLOUD_IMPORT_FAILED', published: 0 }, { status: 503 });
  }
}
