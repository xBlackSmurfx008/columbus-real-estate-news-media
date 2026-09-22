import { getDb } from '@/lib/db';
import { stagePublicIntake } from '@/lib/public-intake';
import { intakeErrorResponse } from '@/lib/intake-security';

export async function POST(request: Request) {
  try { return Response.json(await stagePublicIntake(request, 'contact', getDb()), { status: 202 }); }
  catch (error) { return intakeErrorResponse(error); }
}
