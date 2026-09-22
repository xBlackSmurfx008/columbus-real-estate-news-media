import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { promotionStatement, tokenHash, type IntakeKind } from '@/lib/public-intake';
import { IntakeError, intakeErrorResponse, limitRequest, readIntakeJson } from '@/lib/intake-security';
import { createPreferenceSession, PREFERENCE_COOKIE } from '@/lib/subscriber-preferences';
import { enqueueVerifiedIntakeCrm } from '@/lib/crm-sync';

export async function POST(request: Request) {
  try {
    const body = await readIntakeJson(request); const sql = getDb();
    await limitRequest(sql,request,'intake-confirm');
    if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) throw new IntakeError('Invalid or expired confirmation.');
    const hash = tokenHash(body.token);
    const [pending] = await sql`SELECT kind,email FROM public_intake WHERE token_hash=${hash} AND status='PENDING' AND expires_at>NOW()`;
    if (!pending) throw new IntakeError('This confirmation was used or expired. Submit a new request if necessary.',409);
    const [confirmed] = await sql.query(promotionStatement(pending.kind as IntakeKind),[hash,pending.kind]);
    if (!confirmed) throw new IntakeError('This confirmation was already used.',409);
    if (confirmed.status === 'VERIFIED' && ['lead','contact','subscribe'].includes(confirmed.kind)) {
      try { await enqueueVerifiedIntakeCrm(sql,{ intakeId: String(confirmed.id) }); }
      catch { console.warn('INTAKE_CRM_HANDOFF_PENDING', { intakeId:confirmed.id }); }
    }
    const response = NextResponse.json({ ok:true, kind:confirmed.kind,
      message: confirmed.status === 'VERIFIED' ? 'Email confirmed. Your request is ready for review.' : 'Email confirmed. This request needs review; an existing or suppressed account was not changed.' });
    if (['subscribe','preferences'].includes(confirmed.kind) && confirmed.status === 'VERIFIED') {
      const token = await createPreferenceSession(sql,String(confirmed.email));
      response.cookies.set(PREFERENCE_COOKIE,token,{ httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:1800,path:'/' });
    }
    return response;
  } catch (error) { return intakeErrorResponse(error); }
}
