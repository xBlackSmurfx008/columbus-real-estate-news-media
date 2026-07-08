import { test, expect } from "@playwright/test";

/**
 * The journey bar renders in normal document flow — no portal, no
 * position:fixed. It must scroll away with the page like the rest of
 * the header (owner rejected the floating/pinned variant).
 */
test.describe("Home journey bar", () => {
  test("renders in flow and scrolls away with the page", async ({ page }) => {
    await page.goto("/");

    const bar = page.getByTestId("journey-bar");
    await expect(bar).toBeVisible();

    const position = await bar.evaluate((el) => getComputedStyle(el).position);
    expect(position).not.toBe("fixed");

    const topBefore = await bar.evaluate((el) => el.getBoundingClientRect().top);

    await page.evaluate(() => window.scrollTo(0, 2500));
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(2000);

    const topAfter = await bar.evaluate((el) => el.getBoundingClientRect().top);
    expect(topBefore - topAfter).toBeGreaterThan(2000);
  });
});
