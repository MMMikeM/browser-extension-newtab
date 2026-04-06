import { test, expect } from "./fixtures";

declare global {
  interface Window {
    __toastAdd?: (title: string) => string;
  }
}

test.describe("toast stacking", () => {
  test("single toast appears and is visible", async ({ user1Page: page }) => {
    await page.evaluate(() => window.__toastAdd?.("Task deleted"));

    const toast = page.locator("[data-toast-undo]").first();
    await expect(toast).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: ".filmstrip/toast-single.png", fullPage: false });
  });

  test("two stacked toasts are visible simultaneously", async ({ user1Page: page }) => {
    // Inject two toasts directly via the dev helper (bypasses the undo deduplication)
    await page.evaluate(() => window.__toastAdd?.("Task deleted"));
    await page.waitForTimeout(80);
    await page.evaluate(() => window.__toastAdd?.("Category deleted"));

    // Both should be in the DOM
    const toasts = page.locator("[data-toast-undo]");
    await expect(toasts).toHaveCount(2, { timeout: 3000 });

    await page.screenshot({ path: ".filmstrip/toast-two-stacked.png", fullPage: false });
  });

  test("three stacked toasts show peek-behind effect", async ({ user1Page: page }) => {
    await page.evaluate(() => window.__toastAdd?.("Task deleted"));
    await page.waitForTimeout(80);
    await page.evaluate(() => window.__toastAdd?.("Marked done"));
    await page.waitForTimeout(80);
    await page.evaluate(() => window.__toastAdd?.("Category deleted"));
    await page.waitForTimeout(200);

    const toasts = page.locator("[data-toast-undo]");
    await expect(toasts).toHaveCount(3, { timeout: 3000 });

    // Full-page shot
    await page.screenshot({ path: ".filmstrip/toast-three-stacked.png", fullPage: false });

    // Close-up clipped to the toast stack so the peek effect is visible
    const clip = await page.evaluate(() => {
      const els = document.querySelectorAll("[data-toast-undo]");
      let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
      els.forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        minY = Math.min(minY, r.top);
        maxY = Math.max(maxY, r.bottom);
        minX = Math.min(minX, r.left);
        maxX = Math.max(maxX, r.right);
      });
      return { x: Math.max(0, minX - 30), y: Math.max(0, minY - 30), width: maxX - minX + 60, height: maxY - minY + 50 };
    });
    await page.screenshot({ path: ".filmstrip/toast-three-stacked-closeup.png", clip });
  });
});
