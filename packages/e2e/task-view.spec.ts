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

    // Toggle the task to done via the checkbox
    await page.locator("[data-task-id]").first().getByRole("checkbox").click();

    // Done section toggle button should appear — no crash
    const doneToggle = page.getByRole("button", { name: /done \(\d+\)/i });
    await expect(doneToggle).toBeVisible({ timeout: 5000 });

    // No error overlay
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

    // Expand the section
    await doneToggle.click();

    // Completed tasks should be visible inside the done section
    await expect(page.locator("[data-task-id]").first()).toBeVisible();

    // Still no error overlay
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });
});
