import { test, expect } from "@playwright/test";

/**
 * Home journey strip uses position:fixed + spacer so it must not move in the viewport when scrolling.
 */
test.describe("Home journey bar", () => {
  test("stays at the same viewport offset after scroll (pinned below header)", async ({ page }) => {
    await page.goto("/");

    const bar = page.getByTestId("journey-bar");
    await expect(bar).toBeVisible();

    const topBefore = await bar.evaluate((el) => el.getBoundingClientRect().top);
    // Desktop: topbar 36px + nav 64px ≈ 100px
    expect(topBefore).toBeGreaterThanOrEqual(95);
    expect(topBefore).toBeLessThanOrEqual(105);

    await page.evaluate(() => window.scrollTo(0, 2500));
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(2000);

    const topAfter = await bar.evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(topAfter - topBefore)).toBeLessThan(1.5);
  });

  test("reserves layout space so hero is not covered", async ({ page }) => {
    await page.goto("/");
    const slot = page.getByTestId("journey-bar-slot");
    await expect(slot).toBeVisible();
    const h = await slot.evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThan(40);
  });
});
