import { createHmac } from 'node:crypto';

export type IntakeSql = { query: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]> };
export class IntakeError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export async function readIntakeJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new IntakeError('JSON required.', 415);
  if (Number(request.headers.get('content-length')) > 16384) throw new IntakeError('Request too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new IntakeError('Request body required.');
  const parts: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new IntakeError('Request too large.', 413); }
    parts.push(value);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(parts).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw new IntakeError('Invalid JSON.'); }
}

export function intakeHash(value: string): string {
  const secret = process.env.INTAKE_HASH_SECRET;
  if (!secret || secret.length < 32) throw new IntakeError('Intake is temporarily unavailable.', 503);
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  // All browser writes require Origin. Unattended integrations need their own authenticated endpoint.
  if (!origin || origin !== new URL(request.url).origin) throw new IntakeError('Request origin not allowed.', 403);
}

export async function consumeLimit(sql: IntakeSql, scope: string, identity: string, limit: number, seconds = 900) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = intakeHash(`${scope}:${identity}:${bucket}`);
  const rows = await sql.query(`INSERT INTO intake_rate_limits (key, hits, expires_at)
    VALUES ($1, 1, NOW() + ($2::int * interval '1 second'))
    ON CONFLICT (key) DO UPDATE SET hits = intake_rate_limits.hits + 1
    RETURNING hits`, [key, seconds * 2]);
  if (Number(rows[0]?.hits) > limit) throw new IntakeError('Too many attempts. Please try again later.', 429);
}

export async function limitRequest(sql: IntakeSql, request: Request, action: string, email = '') {
  assertSameOrigin(request);
  // Vercel overwrites this header at its trusted edge; never trust arbitrary x-forwarded-for.
  const ip = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : 'local';
  await consumeLimit(sql, `${action}:ip`, ip || 'unknown', action.includes('login') ? 20 : 30);
  if (email) await consumeLimit(sql, `${action}:email`, email.toLowerCase(), action.includes('login') ? 10 : 5);
}

export async function verifyChallenge(token: unknown, action: string, fetchImpl: typeof fetch = fetch) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const hosts = (process.env.TURNSTILE_EXPECTED_HOSTNAMES || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!secret || !hosts.length) throw new IntakeError('Verification is temporarily unavailable.', 503);
  if (typeof token !== 'string' || !token || token.length > 2048) throw new IntakeError('Complete the security check.');
  let result: { success?: boolean; hostname?: string; action?: string };
  try {
    const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }), signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error();
    result = await response.json();
  } catch { throw new IntakeError('Verification is temporarily unavailable. Please retry.', 503); }
  if (!result.success || !hosts.includes(result.hostname || '') || result.action !== action) {
    throw new IntakeError('Security check expired or invalid. Please retry.');
  }
}

export function intakeErrorResponse(error: unknown) {
  return Response.json({ error: error instanceof IntakeError ? error.message : 'Intake is temporarily unavailable. Please retry.' },
    { status: error instanceof IntakeError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
}
