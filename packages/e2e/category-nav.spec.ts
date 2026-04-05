import { test, expect } from "@playwright/test";

// CategoryTabs (desktop) vs CategorySheet (mobile) rendering
// The `touch:` variant activates on pointer:coarse — Playwright's mobile
// project (iPhone 14) emulates this, desktop project does not.

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#add-task-input", { timeout: 10000 });
});

test("desktop: tab row is visible, sheet trigger is not", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop only");

  // The CategoryTabs border-b element is visible
  await expect(page.locator(".border-b.flex.flex-wrap")).toBeVisible();

  // The sheet trigger is not rendered (hidden via CSS on desktop doesn't mean absent,
  // but the wrapper div has `hidden` class so it's display:none)
  const sheetWrapper = page.locator('[data-testid="category-sheet-trigger"]');
  await expect(sheetWrapper).toBeHidden();
});

test("mobile: sheet trigger visible, tab row hidden", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");

  const trigger = page.getByTestId("category-sheet-trigger");
  await expect(trigger).toBeVisible();

  // Tab row is hidden on touch (touch:hidden = display:none at pointer:coarse)
  // The CategoryTabs wrapper has touch:hidden — verify it's not visible
  const tabRow = page.locator(".border-b.flex.flex-wrap");
  await expect(tabRow).toBeHidden();
});

test("mobile: tapping trigger opens drawer with Inbox and categories", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile only");

  const trigger = page.getByTestId("category-sheet-trigger");
  await trigger.tap();

  // Drawer should be open — Inbox item should be visible
  await expect(page.getByRole("button", { name: "Inbox" })).toBeVisible({ timeout: 3000 });
});

test("mobile: selecting a category from the drawer closes it", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");

  // First add a category via the sheet
  const trigger = page.getByTestId("category-sheet-trigger");
  await trigger.tap();

  // Open add category form
  await page.getByRole("button", { name: "Add category" }).tap();
  await page.locator('input[placeholder="Category name..."]').fill("Errands");
  await page.keyboard.press("Enter");

  // Drawer may have closed; open again to select the new category
  // (The add action may or may not close the drawer — just re-open it)
  await expect(trigger).toBeVisible({ timeout: 3000 });
  await trigger.tap();

  // Select the new category
  await page.getByRole("button", { name: "Errands" }).tap();

  // Drawer should close — the trigger should now show "Errands"
  await expect(trigger).toBeVisible({ timeout: 3000 });
  await expect(trigger).toContainText("Errands");

  // Inbox row should no longer be visible (drawer is closed)
  await expect(page.getByRole("button", { name: "Inbox" })).toBeHidden({ timeout: 3000 });
});

test("mobile: trigger shows active category name", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");

  const trigger = page.getByTestId("category-sheet-trigger");

  // Default state: no category selected, should show "Inbox"
  await expect(trigger).toContainText("Inbox");
});
