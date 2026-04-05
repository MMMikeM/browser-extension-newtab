import { test, expect } from "@playwright/test";

// Verify that unauthenticated users can add tasks that survive page reloads.
// The offline executor should hold mutations in its IDB outbox (retriable error)
// so optimistic state is replayed on reload even with no auth token.

test("signed-out: task is visible after adding", async ({ page }) => {
  // Go to app with no auth — localStorage is empty
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Wait for OPFS + collection init
  await page.waitForSelector("#add-task-input", { timeout: 10000 });

  await page.fill("#add-task-input", "Unauthenticated task");
  await page.keyboard.press("Enter");

  // Task should appear in the list
  await expect(page.getByText("Unauthenticated task")).toBeVisible({ timeout: 5000 });
});

test("signed-out: task survives a page reload", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#add-task-input", { timeout: 10000 });

  await page.fill("#add-task-input", "Reload survivor");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Reload survivor")).toBeVisible({ timeout: 5000 });

  // Reload — IDB outbox should replay the pending optimistic mutation
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

  // Wait 3s — previously the NonRetriableError rollback happened within ~1s
  await page.waitForTimeout(3000);

  await expect(page.getByText("Should not vanish")).toBeVisible();
});
