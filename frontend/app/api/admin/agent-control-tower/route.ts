import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getControlTowerSnapshot } from '@/src/agent/workflows/control-tower';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (session instanceof NextResponse) return session;
  try {
    return NextResponse.json({ ok: true, ...await getControlTowerSnapshot(getDb()) });
  } catch {
    return NextResponse.json({ ok: false, error: 'OPERATIONS_SCHEMA_OR_DATABASE_UNAVAILABLE' }, { status: 503 });
  }
}
