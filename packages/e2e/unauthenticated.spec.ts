import { test, expect } from "@playwright/test";

// Signed out, the offline executor keeps mutations in its IDB outbox (a retriable
// error), so optimistic state replays on reload.

test("signed-out: task is visible after adding", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Wait for OPFS + collection init
  await page.waitForSelector("#add-task-input", { timeout: 10000 });

  await page.fill("#add-task-input", "Unauthenticated task");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Unauthenticated task")).toBeVisible({ timeout: 5000 });
});

test("signed-out: task survives a page reload", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#add-task-input", { timeout: 10000 });

  await page.fill("#add-task-input", "Reload survivor");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Reload survivor")).toBeVisible({ timeout: 5000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#add-task-input", { timeout: 10000 });

  await expect(page.getByText("Reload survivor")).toBeVisible({ timeout: 8000 });
});

test("signed-out: task does NOT disappear immediately (no NonRetriableError rollback)", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#add-task-input", { timeout: 10000 });

  await page.fill("#add-task-input", "Should not vanish");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Should not vanish")).toBeVisible({ timeout: 5000 });

  // A NonRetriableError rollback would land within ~1s
  await page.waitForTimeout(3000);

  await expect(page.getByText("Should not vanish")).toBeVisible();
});
