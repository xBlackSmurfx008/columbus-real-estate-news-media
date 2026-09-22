import { test, expect } from '@playwright/test';
import { SignJWT } from 'jose';

test('member-cookie substitution cannot cross the real admin route boundary', async ({ request }) => {
  const key = new TextEncoder().encode(process.env.CREN_E2E_ADMIN_SECRET);
  const token = async (role: string) => new SignJWT({ userId: 1, email: 'fixture@example.test', role })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(key);
  const rejected = await request.get('/api/admin/agent-control-tower', {
    headers: { cookie: `cren_admin_token=${await token('member')}` },
  });
  expect(rejected.status()).toBe(401);
  // Positive control proves the signing key is correct: admin crosses auth, then fails
  // at the deliberately disconnected test DB. A wrong test key would return 401 here.
  const administrator = await request.get('/api/admin/agent-control-tower', {
    headers: { cookie: `cren_admin_token=${await token('admin')}` },
  });
  expect(administrator.status()).toBe(503);
  expect((await administrator.json()).error).toBe('OPERATIONS_SCHEMA_OR_DATABASE_UNAVAILABLE');
});

test('durable operations APIs reject anonymous access before touching data', async ({ request }) => {
  for (const path of ['/api/cron/agent-control-tower', '/api/cron/editorial-review', '/api/admin/agent-control-tower']) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
  }
});

test('email approval rejects anonymous, member and non-owner sessions before touching data', async ({ request }) => {
  const path = '/api/admin/articles/fixture/email-review';
  const data = { emailId: 'legacy-approval-fixture', confirm: 'approve-exact-email-proof' };
  expect((await request.patch(path, { data })).status()).toBe(401);
  const key = new TextEncoder().encode(process.env.CREN_E2E_ADMIN_SECRET);
  for (const role of ['member', 'admin']) {
    const token = await new SignJWT({ userId: 1, email: 'not-owner@example.test', role })
      .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(key);
    const response = await request.patch(path, { data, headers: { cookie: `cren_admin_token=${token}` } });
    expect(response.status()).toBe(role === 'member' ? 401 : 403);
    if (role === 'admin') expect((await response.json()).error).toBe('OWNER_SESSION_REQUIRED');
  }
});

test('production legacy pilot cannot run in-memory business operations', async ({ request }) => {
  const response = await request.post('/api/agent/pilot', { data: {} });
  expect(response.status()).toBe(503);
  expect((await response.json()).error).toBe('LEGACY_AGENT_PILOT_DISABLED');
});

test('confirmation page requires a deliberate click and removes token from location', async ({ page }) => {
  const confirmations: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/intake/confirm')) confirmations.push(request.url());
  });
  await page.goto(`/confirm-intake#${'a'.repeat(64)}`);
  await expect(page.getByRole('button', { name: 'Confirm my request' })).toBeVisible();
  await expect.poll(() => new URL(page.url()).hash).toBe('');
  expect(confirmations).toHaveLength(0);
  await expect(page.getByText('Only confirm if you submitted this request.', { exact: false })).toBeVisible();
});

test('restored Near East Side hub resolves', async ({ page }) => {
  const response = await page.goto('/areas/near-east-side');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Near East Side');
});

test('CREN acquisition identity does not activate the separate intake funnel', async ({ page }) => {
  await page.goto('/sell/your-home');
  await expect(page.getByRole('button', { name: 'Get my free offer' })).toBeDisabled();
  await expect(page.getByText("I request contact from CREN's property-acquisition service", { exact: false })).toBeVisible();
  await expect(page.getByText('CREN property-acquisition requests are not open yet.', { exact: false })).toBeVisible();
});
