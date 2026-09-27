import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./helpers/mock-api";

// UI behaviour against the dev server with /api mocked — no API server or database needed.

// A production build registers sw.js, which would answer /api before the mocks see it
test.use({ serviceWorkers: "block" });

const openList = async (page: Page) => {
  await mockApi(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-task-id]", { timeout: 15000 });
};

const row = (page: Page, title: string) =>
  page.locator("[data-task-id]", { hasText: title }).first();

const expectNoAxeViolations = async (page: Page) => {
  // Mid-fade text reads as low contrast; skip animations that never settle (infinite, scroll-driven)
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) =>
          a.playState !== "running" ||
          a.timeline !== document.timeline ||
          a.effect?.getTiming().iterations === Infinity,
      ),
  );
  // Base UI inerts everything behind an open sheet or popover; axe would audit it anyway
  const { violations } = await new AxeBuilder({ page }).exclude("[data-base-ui-inert] *").analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
};

test.describe("task rows", () => {
  test("hover actions take no space at rest and appear on hover", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "hover actions are desktop-only");
    await openList(page);
    const target = row(page, "Pick up dry cleaning");
    const actions = target.getByRole("button", { name: "Delete task" }).locator("xpath=..");

    await page.mouse.move(0, 0);
    await expect(actions).toHaveCSS("opacity", "0");

    // The title runs to the row's padding instead of stopping short of a reserved gutter
    const titleBox = await target
      .getByRole("button", { name: "Pick up dry cleaning", exact: true })
      .boundingBox();
    const rowBox = await target.locator(".group\\/task").first().boundingBox();
    expect(rowBox!.x + rowBox!.width - (titleBox!.x + titleBox!.width)).toBeLessThan(12);

    await target.hover();
    await expect(actions).toHaveCSS("opacity", "1");
  });

  test("a ticked task holds in place before moving to Done", async ({ page }) => {
    await openList(page);
    const target = row(page, "Pick up dry cleaning");
    const checkbox = target.getByRole("checkbox");

    await checkbox.click();
    await expect(checkbox).toHaveAttribute("aria-checked", "true");
    await expect(target).toBeVisible();

    await expect(page.locator("[data-task-id]", { hasText: "Pick up dry cleaning" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: /done \(3\)/i })).toBeVisible();
  });

  test("ticking again during the hold cancels the move", async ({ page }) => {
    await openList(page);
    const target = row(page, "Renew passport");
    const checkbox = target.getByRole("checkbox");

    await checkbox.click();
    await checkbox.click();
    await page.waitForTimeout(700);

    await expect(checkbox).toHaveAttribute("aria-checked", "false");
    await expect(target).toBeVisible();
  });

  test("avatars use first and last initials", async ({ page }) => {
    await openList(page);
    await expect(row(page, "Sort out the car insurance").getByTitle("Sam Okafor")).toHaveText("SO");
    await expect(row(page, "Write a thank-you note").getByTitle("Sarah Murray")).toHaveText("SM");
  });
});

test.describe("navigation", () => {
  test("the list title renders once", async ({ page }, testInfo) => {
    await openList(page);
    await expect(page.getByRole("heading", { level: 2, name: "Inbox" })).toHaveCount(1);
    const trigger = page.getByTestId("category-nav-trigger");
    if (testInfo.project.name === "desktop") await expect(trigger).toHaveCount(0);
    else await expect(trigger).toBeVisible();
  });

  test("the column stays put between the list and People", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the sidebar panel is desktop-only");
    await openList(page);
    const column = page.locator("main").locator("..");
    const listX = (await column.boundingBox())!.x;

    await page.getByTestId("category-sidebar").getByRole("link", { name: "People" }).click();
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    await expect(page.getByTestId("category-sidebar")).toBeVisible();
    expect((await column.boundingBox())!.x).toBe(listX);
  });

  test("the sidebar shows open-task counts", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the sidebar is desktop-only");
    await openList(page);
    const sidebar = page.getByTestId("category-sidebar");
    await expect(sidebar.getByRole("button", { name: /^Inbox/ })).toContainText("6");
    await expect(sidebar.getByRole("button", { name: /^Work/ })).toContainText("2");
  });

  test("your shared lists read differently from lists shared with you", async ({
    page,
  }, testInfo) => {
    await openList(page);
    if (testInfo.project.name !== "desktop") await page.getByTestId("category-nav-trigger").click();

    const sharedWithMe = page.getByRole("group", { name: "Shared with me" });
    await expect(sharedWithMe.getByRole("button", { name: /^Groceries/ })).toBeVisible();
    await expect(sharedWithMe.getByRole("button", { name: /^Home/ })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^Home Shared with Sam Okafor/ }).first(),
    ).toBeVisible();
  });

  test("narrow pointer windows swap the sidebar for the list-title sheet", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a fine-pointer window below 40rem");
    await page.setViewportSize({ width: 600, height: 800 });
    await openList(page);

    await expect(page.getByTestId("category-sidebar")).toHaveCount(0);
    await page.getByTestId("category-nav-trigger").click();
    await expect(page.getByRole("button", { name: "Add category" })).toBeVisible();
  });
});

test.describe("deleting a category", () => {
  const openOptions = async (page: Page, name: string, isDesktop: boolean) => {
    if (!isDesktop) await page.getByTestId("category-nav-trigger").click();
    // The innermost element holding both the category's button and its options trigger
    const categoryRow = page
      .locator("div")
      .filter({ has: page.getByRole("button", { name: new RegExp(`^${name}`) }) })
      .filter({ has: page.getByRole("button", { name: "Category options" }) })
      .last();
    if (isDesktop) await categoryRow.hover();
    await categoryRow.getByRole("button", { name: "Category options" }).click();
  };

  const deleteRequest = (page: Page) =>
    page.waitForRequest((r) => r.method() === "DELETE" && r.url().endsWith("/api/categories"));

  test("a category with tasks asks first, and Cancel keeps it", async ({ page }, testInfo) => {
    const isDesktop = testInfo.project.name === "desktop";
    await openList(page);
    await openOptions(page, "Work", isDesktop);
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Delete “Work”?");
    await expect(dialog).toContainText("It has 2 tasks.");
    await expectNoAxeViolations(page);

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Work/ }).first()).toBeVisible();
  });

  for (const [choice, tasks] of [
    ["Move to Inbox", "uncategorise"],
    ["Delete tasks", "delete"],
  ] as const) {
    test(`${choice} sends that choice with the delete`, async ({ page }, testInfo) => {
      await openList(page);
      await openOptions(page, "Work", testInfo.project.name === "desktop");
      await page.getByRole("button", { name: "Delete", exact: true }).click();

      const request = deleteRequest(page);
      await page.getByRole("alertdialog").getByRole("button", { name: choice }).click();
      expect((await request).postDataJSON()).toEqual({ id: "c-work", tasks });
    });
  }

  test("an empty category deletes without asking", async ({ page }, testInfo) => {
    await openList(page);
    await openOptions(page, "Home", testInfo.project.name === "desktop");

    const request = deleteRequest(page);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    expect((await request).postDataJSON()).toEqual({ id: "c-home", tasks: "uncategorise" });
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page.getByText("Category deleted")).toBeVisible();
  });

  test("a refused delete says so and brings the category back", async ({ page }, testInfo) => {
    await openList(page);
    await page.route("**/api/categories", (route) =>
      route.request().method() === "DELETE"
        ? route.fulfill({ status: 400, contentType: "application/json", body: '{"error":"no"}' })
        : route.fallback(),
    );
    await openOptions(page, "Home", testInfo.project.name === "desktop");
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("Couldn't delete “Home”")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Home/ }).first()).toBeVisible();
  });
});

test.describe("accessibility", () => {
  test("task list", async ({ page }) => {
    await openList(page);
    await expectNoAxeViolations(page);
  });

  test("task detail sheet", async ({ page }) => {
    await openList(page);
    await row(page, "Book flights")
      .getByRole("button", { name: /^Book flights/ })
      .click();
    await expect(page.locator('[data-slot="drawer-content"]')).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("category navigation", async ({ page }, testInfo) => {
    await openList(page);
    if (testInfo.project.name === "desktop") {
      const pill = page
        .getByTestId("category-sidebar")
        .locator(".group\\/pill")
        .filter({ hasText: "Work" });
      await pill.hover();
      await pill.getByRole("button", { name: "Category options" }).click();
      await expect(page.getByRole("button", { name: "Rename" })).toBeVisible();
    } else {
      await page.getByTestId("category-nav-trigger").click();
      await expect(page.getByRole("button", { name: "Add category" })).toBeVisible();
    }
    await expectNoAxeViolations(page);
  });

  test("people", async ({ page }) => {
    await mockApi(page);
    await page.goto("/people", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Sarah Murray", { exact: true })).toBeVisible({ timeout: 15000 });
    await expectNoAxeViolations(page);
  });

  test("sign in", async ({ page }) => {
    await mockApi(page, { signedIn: false });
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible({ timeout: 15000 });
    await expectNoAxeViolations(page);
  });
});
