import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from 'node:crypto';

// Shared only by this test process/workers and its local web server; never a production credential.
process.env.CREN_E2E_ADMIN_SECRET ??= randomBytes(32).toString('hex');

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3001",
    // Optional installed Chrome avoids downloading a second browser on attended macOS runs.
    ...(process.env.CREN_TEST_BROWSER_CHANNEL === 'chrome' ? { channel: 'chrome' } : {}),
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  /* Production server on :3001 — next dev refuses a second instance in the same app dir */
  webServer: {
    command: "npm run build && npx next start -p 3001 -H 127.0.0.1",
    env: { DATABASE_URL: '', ADMIN_JWT_SECRET: process.env.CREN_E2E_ADMIN_SECRET, MEMBER_JWT_SECRET: '',
      NEXT_PUBLIC_CREN_ACQUISITION_ENTITY_NAME: 'CREN', NEXT_PUBLIC_CREN_ACQUISITION_INTAKE_ENABLED: 'false' },
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
