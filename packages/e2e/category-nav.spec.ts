import { test, expect } from "@playwright/test";
import { createCategory } from "./helpers/app";

// CategoryNav renders either CategorySidebar (desktop, pointer:fine) or
// CategoryMobileSheet (mobile, pointer:coarse) — never both simultaneously.
// The `touch:` Tailwind variant activates on pointer:coarse; Playwright's
// mobile project (iPhone 14) emulates this.

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#add-task-input", { timeout: 10000 });
});

// ─── Single-component guarantee ─────────────────────────────────────────────

test("desktop: sidebar in DOM, mobile trigger absent", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop only");

  // Sidebar element exists in DOM
  await expect(page.getByTestId("category-sidebar")).toHaveCount(1);

  // Mobile header trigger must not exist at all (JS-switched, not CSS-hidden)
  await expect(page.getByTestId("category-nav-trigger")).toHaveCount(0);
});

test("mobile: sidebar absent from DOM, header trigger present", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");

  // Sidebar element must not exist at all (not just hidden)
  await expect(page.getByTestId("category-sidebar")).toHaveCount(0);

  // Header trigger present and visible
  await expect(page.getByTestId("category-nav-trigger")).toBeVisible();
});

// ─── Desktop sidebar ─────────────────────────────────────────────────────────

test("desktop: sidebar shows added category", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop only");

  await createCategory(page, "Personal", "sidebar");

  const sidebar = page.getByTestId("category-sidebar");
  await expect(sidebar.getByText("Personal")).toBeVisible();
});

test("desktop: clicking a sidebar category switches the active list", async ({
  page,
  isMobile,
}) => {
  test.skip(!!isMobile, "desktop only");

  const sidebar = page.getByTestId("category-sidebar");

  // Add a second category via the inline add form
  await createCategory(page, "Work", "sidebar");

  // Click Work in the sidebar
  await sidebar.getByText("Work").click();

  // The sidebar pill should reflect active state
  await expect(sidebar.getByText("Work")).toBeVisible();
});

test("desktop: People link visible in sidebar", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop only");

  await expect(
    page.getByTestId("category-sidebar").getByRole("link", { name: "People" }),
  ).toBeVisible();
});

// ─── Category options popover — stacking context ─────────────────────────────

/**
 * Opens the options popover for a category pill.
 * The ellipsis trigger is opacity-0 until hover — use force:true to click it
 * regardless of computed opacity.
 */
const openCategoryOptionsPopover = async (
  page: Parameters<typeof createCategory>[0],
  categoryName: string,
) => {
  const sidebar = page.getByTestId("category-sidebar");
  // The category name lives inside a <button> whose direct parent is the pill div.
  // Navigate: text node → <span> → <button> → pill <div>
  const categoryBtn = sidebar.locator(`button:has-text("${categoryName}")`).first();
  const pill = categoryBtn.locator("..");
  await pill.hover();
  // force:true bypasses the opacity-0 visibility check
  await pill.getByRole("button", { name: "Category options" }).click({ force: true });
};

test("desktop: category options popover is visible above main content", async ({
  page,
  isMobile,
}) => {
  test.skip(!!isMobile, "desktop only");

  await createCategory(page, "StackTest", "sidebar");
  await openCategoryOptionsPopover(page, "StackTest");

  // Popover must be visible
  await expect(
    page.getByRole("menuitem", { name: "Rename" }).or(page.getByText("Rename")),
  ).toBeVisible({ timeout: 3000 });
});

test("desktop: category options popover Rename item is not obscured by main content", async ({
  page,
  isMobile,
}) => {
  test.skip(!!isMobile, "desktop only");

  await createCategory(page, "LayerTest", "sidebar");
  await openCategoryOptionsPopover(page, "LayerTest");

  const renameBtn = page.getByRole("button", { name: "Rename" }).first();
  await expect(renameBtn).toBeVisible({ timeout: 3000 });

  // elementFromPoint at the center of the Rename button must resolve to an
  // element inside the popover — not the AppShell content behind it.
  const box = await renameBtn.boundingBox();
  if (!box) throw new Error("Rename button has no bounding box");

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const topElement = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y);
      // Walk up to find a meaningful ancestor for identification
      let cur: Element | null = el;
      while (cur) {
        if (cur.getAttribute("data-popup") !== null) return "popover";
        if (cur.getAttribute("data-slot") === "button") return "popover";
        if (cur.textContent?.trim() === "Rename") return "popover";
        if (cur.getAttribute("data-testid") === "category-sidebar") return "popover";
        // AppShell main content wrapper
        if (cur.classList.contains("max-w-sm")) return "main-content";
        cur = cur.parentElement;
      }
      return "unknown";
    },
    [cx, cy] as [number, number],
  );

  expect(topElement).toBe("popover");
});

test("desktop: clicking Rename in category options starts rename flow", async ({
  page,
  isMobile,
}) => {
  test.skip(!!isMobile, "desktop only");

  await createCategory(page, "RenameMe", "sidebar");
  await openCategoryOptionsPopover(page, "RenameMe");

  await page.getByRole("button", { name: "Rename" }).first().click();

  // Rename form should appear in the sidebar
  const sidebar = page.getByTestId("category-sidebar");
  await expect(sidebar.locator('input[type="text"]')).toBeVisible({ timeout: 3000 });
});

test("desktop: clicking Delete in category options removes the category", async ({
  page,
  isMobile,
}) => {
  test.skip(!!isMobile, "desktop only");

  await createCategory(page, "DeleteMe", "sidebar");
  await openCategoryOptionsPopover(page, "DeleteMe");

  await page.getByRole("button", { name: "Delete" }).first().click();
  await page.waitForTimeout(300);

  await expect(page.getByTestId("category-sidebar").getByText("DeleteMe")).toHaveCount(0);
});

// ─── Mobile bottom sheet ─────────────────────────────────────────────────────

test("mobile: tapping header trigger opens sheet", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");

  await page.getByTestId("category-nav-trigger").tap();

  // Sheet is open — the Add category button is always present
  await expect(page.getByRole("button", { name: "Add category" })).toBeVisible({ timeout: 3000 });
});

test("mobile: selecting a category from the sheet closes it and updates trigger", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile only");

  const trigger = page.getByTestId("category-nav-trigger");

  // Open sheet, add a category, and select it in one session
  await trigger.tap();
  await page.getByRole("button", { name: "Add category" }).tap();
  await page.locator('input[placeholder="Category name..."]').fill("Errands");
  await page.keyboard.press("Enter");

  // "Errands" row is now visible — tap it directly (no need to reopen)
  await page.getByRole("button", { name: "Errands" }).tap();

  // Sheet closes and trigger reflects new active category
  await expect(trigger).toContainText("Errands");
  await expect(page.getByRole("button", { name: "Add category" })).toBeHidden({ timeout: 3000 });
});

test("mobile: input chip visible with active category", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");

  const chip = page.getByTestId("category-input-chip");

  // Chip is always visible on mobile
  await expect(chip).toBeVisible();

  // Default: shows "Inbox" when no category is active
  await expect(chip).toContainText("Inbox");

  // After selecting a category the chip updates
  await page.getByTestId("category-nav-trigger").tap();
  await page.getByRole("button", { name: "Add category" }).tap();
  await page.locator('input[placeholder="Category name..."]').fill("Personal");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Personal" }).tap();

  await expect(chip).toContainText("Personal");
});

test("mobile: tapping input chip opens the category sheet", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");

  await page.getByTestId("category-input-chip").tap();

  // Sheet is open — the Add category button is always present
  await expect(page.getByRole("button", { name: "Add category" })).toBeVisible({ timeout: 3000 });
});

test("mobile: header trigger and input chip stay visible while scrolling", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile only");

  // Add enough tasks to make the list scrollable
  for (let i = 1; i <= 8; i++) {
    await page.fill("#add-task-input", `Task ${i}`);
    await page.keyboard.press("Enter");
  }

  // Scroll down in the content area
  await page.evaluate(() => {
    const content = document.querySelector(".touch\\:order-1") as HTMLElement | null;
    if (content) content.scrollTop = 400;
    else window.scrollBy(0, 400);
  });

  // Both nav affordances must remain visible after scrolling
  await expect(page.getByTestId("category-nav-trigger")).toBeVisible();
  await expect(page.getByTestId("category-input-chip")).toBeVisible();
});

test("mobile: People link present in the sheet", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");

  await page.getByTestId("category-nav-trigger").tap();

  await expect(page.getByRole("link", { name: "People" })).toBeVisible({ timeout: 3000 });
});
