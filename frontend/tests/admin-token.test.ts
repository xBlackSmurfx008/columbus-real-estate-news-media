import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT } from 'jose';
import { signToken, verifyToken } from '../lib/admin-token.ts';

test('member tokens cannot be substituted for administrator cookies even with shared keys', async () => {
  const prior = process.env.ADMIN_JWT_SECRET;
  process.env.ADMIN_JWT_SECRET = 'isolated-jwt-fixture-key-that-never-leaves-this-test';
  const key = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET);
  try {
    const member = await new SignJWT({ userId: 1, email: 'reader@example.test', role: 'member' })
      .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(key);
    assert.equal(await verifyToken(member), null);
    const claims = { userId: 1, email: 'owner@example.test', role: 'admin' };
    assert.deepEqual(await verifyToken(await signToken(claims)), claims);
    await assert.rejects(signToken({ ...claims, role: 'member' }), /ADMIN_CLAIMS_REQUIRED/);
    for (const invalid of [{ ...claims, userId: -1 }, { ...claims, userId: '1' }, { ...claims, role: 'editor' }, { ...claims, email: null }]) {
      const token = await new SignJWT(invalid).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(key);
      assert.equal(await verifyToken(token), null);
    }
    const noExpiry = await new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).sign(key);
    assert.equal(await verifyToken(noExpiry), null);
    const wrongAlgorithm = await new SignJWT(claims).setProtectedHeader({ alg: 'HS384' }).setExpirationTime('1h').sign(key);
    assert.equal(await verifyToken(wrongAlgorithm), null);
  } finally {
    if (prior === undefined) delete process.env.ADMIN_JWT_SECRET;
    else process.env.ADMIN_JWT_SECRET = prior;
  }
});
