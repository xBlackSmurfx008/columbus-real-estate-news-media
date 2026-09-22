import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { stagePublicIntake } from '@/lib/public-intake';
import { intakeErrorResponse } from '@/lib/intake-security';

export async function POST(request: NextRequest) {
  try { return NextResponse.json(await stagePublicIntake(request, 'member', getDb()), { status: 202 }); }
  catch (error) { return intakeErrorResponse(error); }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const sql = getDb();
    const members = await sql`SELECT id,email,name,interests,preferred_area,role,bio,tier,status,created_at,updated_at
      FROM members ORDER BY created_at DESC LIMIT 500`;
    return NextResponse.json({ members });
  } catch { return NextResponse.json({ error: 'Unable to load members.' }, { status: 503 }); }
}
