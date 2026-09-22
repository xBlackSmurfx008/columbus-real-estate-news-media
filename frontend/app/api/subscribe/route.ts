import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { stagePublicIntake } from '@/lib/public-intake';
import { intakeErrorResponse, limitRequest, readIntakeJson } from '@/lib/intake-security';
import { PREFERENCE_COOKIE, saveSubscriberPreferences, suppressSubscriber } from '@/lib/subscriber-preferences';

export async function POST(request: NextRequest) {
  try {
    const body = await readIntakeJson(request.clone());
    const sql = getDb();
    if (body.step === 'profile') {
      await limitRequest(sql, request, 'subscriber-preferences');
      return Response.json(await saveSubscriberPreferences(sql, request.cookies.get(PREFERENCE_COOKIE)?.value, body));
    }
    if (body.step === 'preferences-link') return Response.json(await stagePublicIntake(request,'preferences',sql),{status:202});
    return Response.json(await stagePublicIntake(request, 'subscribe', sql), { status: 202 });
  } catch (error) { return intakeErrorResponse(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const sql = getDb(); await limitRequest(sql,request,'subscriber-preferences');
    return Response.json(await suppressSubscriber(sql,request.cookies.get(PREFERENCE_COOKIE)?.value));
  } catch (error) { return intakeErrorResponse(error); }
}
