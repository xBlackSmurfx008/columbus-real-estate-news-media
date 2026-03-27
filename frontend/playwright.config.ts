import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  /* Production server on :3001 — next dev refuses a second instance in the same app dir */
  webServer: {
    command: "npm run build && npx next start -p 3001 -H 127.0.0.1",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
