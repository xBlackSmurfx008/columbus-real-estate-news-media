import { randomBytes } from 'node:crypto';
import { tokenHash, text } from './public-intake.ts';
import { IntakeError, type IntakeSql } from './intake-security.ts';

export const PREFERENCE_COOKIE = 'cren_subscriber_preferences';
export async function createPreferenceSession(sql: IntakeSql, email: string) {
  const token = randomBytes(32).toString('hex');
  await sql.query(`INSERT INTO subscriber_preference_sessions (token_hash,email,expires_at)
    VALUES ($1,$2,NOW()+interval '30 minutes')`, [tokenHash(token),email]);
  return token;
}

export async function saveSubscriberPreferences(sql: IntakeSql, cookie: string | undefined, body: Record<string, unknown>) {
  if (!cookie || !/^[a-f0-9]{64}$/.test(cookie)) throw new IntakeError('Confirm your email before editing preferences.', 401);
  const [session] = await sql.query('SELECT email FROM subscriber_preference_sessions WHERE token_hash=$1 AND expires_at>NOW()', [tokenHash(cookie)]);
  if (!session) throw new IntakeError('Preference session expired. Confirm your email again.', 401);
  const rows = await sql.query(`UPDATE subscribers SET area=COALESCE(NULLIF($2,''),area),
    topic=COALESCE(NULLIF($3,''),topic),updated_at=NOW()
    WHERE lower(email)=$1 AND status='active' AND NOT EXISTS (SELECT 1 FROM subscriber_suppressions WHERE email=$1)
    RETURNING id`, [session.email,text(body.area,120),text(body.topic,500)]);
  if (!rows.length) throw new IntakeError('This subscription is inactive. Preferences cannot reactivate it.', 409);
  return { ok: true, step: 'profile' };
}

export async function suppressSubscriber(sql: IntakeSql, cookie: string | undefined) {
  if (!cookie || !/^[a-f0-9]{64}$/.test(cookie)) throw new IntakeError('Confirm your email to manage this subscription.',401);
  const [row] = await sql.query(`WITH owner AS (
      SELECT email FROM subscriber_preference_sessions WHERE token_hash=$1 AND expires_at>NOW()
    ), suppression AS (
      INSERT INTO subscriber_suppressions (email,reason) SELECT email,'owner-opt-out' FROM owner
      ON CONFLICT (email) DO UPDATE SET reason='owner-opt-out' RETURNING email
    ), withdrawn AS (
      UPDATE public_intake SET consent=jsonb_set(consent,'{newsletter}','false'::jsonb)
      WHERE kind='subscribe' AND email IN (SELECT email FROM suppression) RETURNING id
    ) UPDATE subscribers SET status='unsubscribed',updated_at=NOW()
      WHERE lower(email) IN (SELECT email FROM suppression) RETURNING id`,[tokenHash(cookie)]);
  if (!row) throw new IntakeError('Preference session expired.',401);
  return { ok:true };
}
