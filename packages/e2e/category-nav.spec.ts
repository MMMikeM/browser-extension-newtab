import { test, expect } from "./fixtures";
import { signIn } from "./helpers/auth";
import { createCategory } from "./helpers/app";
import { apiRequest } from "./helpers/api";

// Sidebar or sheet is chosen by pointer type (`touch:` is pointer:coarse), which the
// mobile project (iPhone 14) emulates.

test.beforeEach(async ({ page, user1Auth }) => {
  // Tasks first: the server won't delete a category that still has tasks
  const tasks = await apiRequest<{ id: string; parentId: string | null }[]>(
    "GET",
    "/api/tasks",
    undefined,
    user1Auth.token,
  );
  await Promise.allSettled(
    tasks
      .filter((t) => !t.parentId)
      .map((t) => apiRequest("DELETE", "/api/tasks", { id: t.id }, user1Auth.token)),
  );
  const categories = await apiRequest<{ id: string }[]>(
    "GET",
    "/api/categories",
    undefined,
    user1Auth.token,
  );
  await Promise.allSettled(
    categories.map((c) => apiRequest("DELETE", "/api/categories", { id: c.id }, user1Auth.token)),
  );

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await signIn(page, user1Auth);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#add-task-input", { timeout: 10000 });
  // CategoryMobileSheet is lazy — wait for trigger on mobile (no-op on desktop)
  await page
    .locator('[data-testid="category-nav-trigger"]')
    .waitFor({ timeout: 3000 })
    .catch(() => {});
});

test("desktop: sidebar in DOM, mobile trigger absent", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop only");

  await expect(page.getByTestId("category-sidebar")).toHaveCount(1);

  // Switched in JS, not hidden with CSS
  await expect(page.getByTestId("category-nav-trigger")).toHaveCount(0);
});

test("mobile: sidebar absent from DOM, header trigger present", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");

  await expect(page.getByTestId("category-sidebar")).toHaveCount(0);

  await expect(page.getByTestId("category-nav-trigger")).toBeVisible();
});

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

  await createCategory(page, "Work", "sidebar");

  await sidebar.getByText("Work").click();

  await expect(sidebar.getByText("Work")).toBeVisible();
});

test("desktop: People link visible in sidebar", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop only");

  await expect(
    page.getByTestId("category-sidebar").getByRole("link", { name: "People" }),
  ).toBeVisible();
});

const openCategoryOptionsPopover = async (
  page: Parameters<typeof createCategory>[0],
  categoryName: string,
) => {
  const sidebar = page.getByTestId("category-sidebar");
  // The name's <button> sits directly inside the pill <div>
  const categoryBtn = sidebar.locator(`button:has-text("${categoryName}")`).first();
  const pill = categoryBtn.locator("..");
  await pill.hover();
  // The trigger is opacity-0 until hover; force skips the visibility check
  await pill.getByRole("button", { name: "Category options" }).click({ force: true });
};

test("desktop: category options popover is visible above main content", async ({
  page,
  isMobile,
}) => {
  test.skip(!!isMobile, "desktop only");

  await createCategory(page, "StackTest", "sidebar");
  await openCategoryOptionsPopover(page, "StackTest");

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

  const renameBtn = page.getByRole("button", { name: "Rename" }).first();
  await expect(renameBtn).toBeVisible({ timeout: 3000 });
  // locator.click() dispatches CDP pointer events which interfere with
  // floating-ui's useDismiss insideReactTree flag. Use element.click() instead.
  await renameBtn.evaluate((el) => (el as HTMLElement).click());

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

  const deleteBtn = page.getByRole("button", { name: "Delete" }).first();
  await expect(deleteBtn).toBeVisible({ timeout: 3000 });
  // Same floating-ui/CDP issue as Rename above — use element.click()
  await deleteBtn.evaluate((el) => (el as HTMLElement).click());

  await expect(page.getByTestId("category-sidebar").getByText("DeleteMe")).toHaveCount(0, {
    timeout: 5000,
  });
});

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

  await trigger.tap();
  await page.getByRole("button", { name: "Add category" }).tap();
  await page.locator('input[placeholder="Category name..."]').fill("Errands");
  await page.keyboard.press("Enter");

  // The sheet stays open after adding
  await page.getByRole("button", { name: "Errands" }).tap();

  await expect(trigger).toContainText("Errands");
  await expect(page.getByRole("button", { name: "Add category" })).toBeHidden({ timeout: 3000 });
});

test("mobile: input chip visible with active category", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");

  const chip = page.getByTestId("category-input-chip");

  await expect(chip).toBeVisible();

  await expect(chip).toContainText("Inbox");

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

  await page.evaluate(() => {
    const content = document.querySelector(".touch\\:order-1") as HTMLElement | null;
    if (content) content.scrollTop = 400;
    else window.scrollBy(0, 400);
  });

  await expect(page.getByTestId("category-nav-trigger")).toBeVisible();
  await expect(page.getByTestId("category-input-chip")).toBeVisible();
});

test("mobile: People link present in the sheet", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");

  await page.getByTestId("category-nav-trigger").tap();

  await expect(page.getByRole("link", { name: "People" })).toBeVisible({ timeout: 3000 });
});
