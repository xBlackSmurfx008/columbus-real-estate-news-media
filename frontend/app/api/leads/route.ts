import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { stagePublicIntake } from '@/lib/public-intake';
import { intakeErrorResponse } from '@/lib/intake-security';

export async function POST(request: NextRequest) {
  try { return NextResponse.json(await stagePublicIntake(request, 'lead', getDb()), { status: 202 }); }
  catch (error) { return intakeErrorResponse(error); }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const persona = searchParams.get('persona'); const status = searchParams.get('status');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 500);
    const sql = getDb();
    const leads = await sql`SELECT * FROM leads WHERE (${persona}::text IS NULL OR persona=${persona})
      AND (${status}::text IS NULL OR status=${status}) ORDER BY created_at DESC LIMIT ${limit}`;
    return NextResponse.json({ leads });
  } catch { return NextResponse.json({ error: 'Unable to load leads.' }, { status: 503 }); }
}
