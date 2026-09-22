import { SignJWT, jwtVerify } from 'jose';

export type AdminClaims = { userId: number; email: string; role: 'admin' };

function adminClaims(payload: Record<string, unknown>): AdminClaims | null {
  if (payload.role !== 'admin' || typeof payload.userId !== 'number' || !Number.isSafeInteger(payload.userId)
    || payload.userId <= 0 || typeof payload.email !== 'string' || !payload.email.includes('@') || payload.email.length > 320) return null;
  return { userId: payload.userId, email: payload.email, role: 'admin' };
}

function secretKey() {
  if (!process.env.ADMIN_JWT_SECRET) throw new Error('ADMIN_JWT_SECRET is required');
  return new TextEncoder().encode(process.env.ADMIN_JWT_SECRET);
}

export async function signToken(payload: { userId: number; email: string; role: string }) {
  const claims = adminClaims(payload);
  if (!claims) throw new Error('ADMIN_CLAIMS_REQUIRED');
  return new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(secretKey());
}

/** A signature alone never grants administrator authority, even with shared legacy signing keys. */
export async function verifyToken(token: string): Promise<AdminClaims | null> {
  if (!token || token.length > 4096) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null;
    return adminClaims(payload);
  } catch { return null; }
}
