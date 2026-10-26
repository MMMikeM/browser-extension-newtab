import AxeBuilder from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";
import { test, expect } from "./fixtures";
import { mockApi, mockData } from "./helpers/mock-api";

// Every list, a subtask with a note, a description match and a done one
const searchData = () => {
  const data = mockData();
  const [template] = data.tasks;
  const at = "2026-09-20T09:00:00.000Z";
  const subtask = data.tasks.find((t) => t.title === "Compare Tuesday and Wednesday fares")!;
  data.tasks.push(
    {
      ...template!,
      id: "s-photos",
      title: "Find the old passport photos",
      categoryId: "c-home",
      description: null,
      sortOrder: "a5",
    },
    {
      ...template!,
      id: "s-offsite",
      title: "Plan the Lisbon offsite",
      categoryId: "c-work",
      description: "Bring your passport for the visa check at the gate",
      sortOrder: "a6",
    },
    {
      ...template!,
      id: "s-done",
      title: "Renew Sam's passport",
      categoryId: "c-home",
      status: "done",
      completedAt: "2026-09-02T10:00:00.000Z",
      description: null,
      sortOrder: "a7",
    },
  );
  (data.notes as unknown[]).push({
    id: "n-fares",
    userId: "u-mike",
    taskId: subtask.id,
    title: "Sam's passport runs out in March",
    content: "Sam's passport runs out in March",
    createdAt: at,
    updatedAt: at,
  });
  return data;
};

const isDesk = (testInfo: TestInfo) => testInfo.project.name === "desktop";

const openSearch = async (page: Page, testInfo: TestInfo) => {
  if (isDesk(testInfo)) {
    await page.keyboard.press("/");
  } else {
    await page.getByTestId("category-nav-trigger").click();
    await page.getByRole("button", { name: "Search all lists" }).click();
  }
  await page.waitForURL("**/search");
  return page.getByRole("searchbox", { name: "Search every list" });
};

const results = (page: Page) => page.locator("main [data-task-id]");
const result = (page: Page, title: string) =>
  page.locator("[data-task-id]", { hasText: title }).first();

test.beforeEach(async ({ page }) => {
  await mockApi(page, { data: searchData() });
  await page.goto("/");
  await page.waitForSelector("[data-task-id]");
});

test("finds tasks across every list, grouped by list, with what matched", async ({
  page,
}, testInfo) => {
  const field = await openSearch(page, testInfo);
  await expect(field).toBeFocused();
  await field.fill("passport");

  for (const list of ["Inbox", "Work", "Home", "Done"])
    await expect(page.getByRole("region", { name: list })).toBeVisible();
  await expect(result(page, "Renew passport").locator("mark")).toHaveText("passport");
  // A description match shows the line it matched in
  await expect(result(page, "Plan the Lisbon offsite")).toContainText(
    "Bring your passport for the visa check",
  );
  // A subtask's note, with the task the subtask sits under
  const fares = result(page, "Compare Tuesday and Wednesday fares");
  await expect(fares).toContainText("Sam's passport runs out in March");
  await expect(fares).toContainText("in Book flights for the October trip");
  await expect(
    page.getByRole("region", { name: "Done" }).getByText("Renew Sam's passport"),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Done" })).toContainText("Home · Sep 2");
});

test("a typo is corrected, and there's nothing to add for it", async ({ page }, testInfo) => {
  const field = await openSearch(page, testInfo);
  await field.fill("pasport");
  await expect(page.getByText("Showing results for")).toContainText("passport");
  await expect(result(page, "Renew passport")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Add “/ })).toHaveCount(0);
});

test("adding from search puts the task in the list it was opened from", async ({
  page,
}, testInfo) => {
  await page.evaluate(() => localStorage.setItem("newtab-todo-active-category", "c-work"));
  await page.reload();
  await page.waitForSelector("[data-task-id]");

  const field = await openSearch(page, testInfo);
  await field.fill("Book the vet");
  await expect(page.getByText("Nothing matches.")).toBeVisible();
  await page.getByRole("button", { name: "Add “Book the vet” to Work" }).click();

  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.locator("[data-task-id]", { hasText: "Book the vet" })).toBeVisible();
});

test("a task opened from the results closes back onto them", async ({ page }, testInfo) => {
  const field = await openSearch(page, testInfo);
  await field.fill("passport");
  await result(page, "Find the old passport photos")
    .getByRole("button", { name: /Find the old passport photos/ })
    .click();
  await expect(page.locator('[data-slot="drawer-content"]')).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator('[data-slot="drawer-content"]')).toHaveCount(0);
  await expect(page).toHaveURL(/\/search$/);
  await expect(field).toHaveValue("passport");
  await expect(results(page).first()).toBeVisible();
});

test("ticking a result offers Undo", async ({ page }, testInfo) => {
  const field = await openSearch(page, testInfo);
  await field.fill("photos");
  await result(page, "Find the old passport photos").getByRole("checkbox").click();
  await expect(page.locator("[data-toast-undo]")).toContainText("Marked done");
  await expect(
    page.getByRole("region", { name: "Done" }).getByText("Find the old passport photos"),
  ).toBeVisible();
});

test("Escape in the field goes back to the list", async ({ page }, testInfo) => {
  const field = await openSearch(page, testInfo);
  await field.press("Escape");
  await page.waitForURL((url) => url.pathname === "/");
});

test("a slash typed into the capture input stays there", async ({ page }, testInfo) => {
  test.skip(!isDesk(testInfo), "the shortcut is for a keyboard");
  const capture = page.locator("#add-task-input");
  await capture.fill("either");
  await capture.press("/");
  await expect(capture).toHaveValue("either/");
  await expect(page).not.toHaveURL(/search/);
});

test("search passes axe", async ({ page }, testInfo) => {
  const field = await openSearch(page, testInfo);
  await field.fill("passport");
  await expect(result(page, "Renew passport")).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).exclude("[data-base-ui-inert] *").analyze();
  expect(violations).toEqual([]);
});
