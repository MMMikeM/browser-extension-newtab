import { test, expect } from "./fixtures";
import { createTask } from "./helpers/app";
import { apiRequest } from "./helpers/api";

test.beforeEach(async ({ user1Auth }) => {
  type Task = { id: string; parentId: string | null };
  const tasks = await apiRequest<Task[]>("GET", "/api/tasks", undefined, user1Auth.token);
  await Promise.allSettled(
    tasks
      .filter((t) => !t.parentId)
      .map((t) => apiRequest("DELETE", "/api/tasks", { id: t.id }, user1Auth.token)),
  );
});

test.describe("done section", () => {
  test("renders without error when tasks are marked done", async ({ user1Page: page }) => {
    await createTask(page, "Task to complete");
    await page.waitForSelector("[data-task-id]");

    await page.locator("[data-task-id]").first().getByRole("checkbox").click();

    const doneToggle = page.getByRole("button", { name: /done \(\d+\)/i });
    await expect(doneToggle).toBeVisible({ timeout: 5000 });

    await expect(page.getByText("Something went wrong")).not.toBeVisible();
    await expect(page.getByText("Cannot convert object to primitive value")).not.toBeVisible();
  });

  test("expands to show completed tasks without error", async ({ user1Page: page }) => {
    await createTask(page, "Task one");
    await createTask(page, "Task two");
    await page.waitForSelector("[data-task-id]");

    // By title: a ticked row holds in place briefly, so "first" would stay the same row
    for (const title of ["Task one", "Task two"]) {
      await page.locator("[data-task-id]", { hasText: title }).getByRole("checkbox").click();
    }

    const doneToggle = page.getByRole("button", { name: /done \(\d+\)/i });
    await expect(doneToggle).toBeVisible({ timeout: 3000 });

    await doneToggle.click();

    await expect(page.locator("[data-task-id]").first()).toBeVisible();

    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });
});
