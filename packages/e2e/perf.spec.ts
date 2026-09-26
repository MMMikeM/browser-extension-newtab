import { test, expect, type Page } from "@playwright/test";

// Budget in milliseconds — fail the build if we regress past this
const DCL_BUDGET_MS = 1000;

const measure = async (page: Page, url: string): Promise<number> => {
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const dcl = await page.evaluate(() => {
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return entry ? entry.domContentLoadedEventEnd : performance.now();
  });

  return Math.round(dcl);
};

test.describe("Time to DOMContentLoaded", () => {
  test("/ (empty state)", async ({ page }) => {
    const ms = await measure(page, "/");
    console.log(`  DOMContentLoaded /        → ${ms} ms`);
    expect(ms, `DOMContentLoaded exceeded ${DCL_BUDGET_MS} ms budget`).toBeLessThan(DCL_BUDGET_MS);
  });

  test("/auth", async ({ page }) => {
    const ms = await measure(page, "/auth");
    console.log(`  DOMContentLoaded /auth     → ${ms} ms`);
    expect(ms, `DOMContentLoaded exceeded ${DCL_BUDGET_MS} ms budget`).toBeLessThan(DCL_BUDGET_MS);
  });
});
