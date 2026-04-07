import { test, expect } from "./fixtures";
import { createTask } from "./helpers/app";
import { apiRequest } from "./helpers/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Opens the task detail drawer for the first task in the list. */
const openFirstTaskDetail = async (page: Parameters<typeof createTask>[0]) => {
  await page.locator("[data-task-id]").first().click();
  await page.waitForSelector('[data-slot="drawer-content"]', { timeout: 5000 });
  // Brief settle — drawer animation
  await page.waitForTimeout(300);
};

/** The task detail drawer panel. */
const drawer = (page: Parameters<typeof createTask>[0]) =>
  page.locator('[data-slot="drawer-content"]');

// ---------------------------------------------------------------------------
// Setup / teardown — wipe all tasks so each test starts clean
// ---------------------------------------------------------------------------

test.beforeEach(async ({ user1Auth }) => {
  type Task = { id: string; parentId: string | null };
  const tasks = await apiRequest<Task[]>("GET", "/api/tasks", undefined, user1Auth.token);
  // Delete only top-level tasks — subtasks cascade-delete on the server
  // allSettled: parallel workers may have already deleted some tasks (404 is fine)
  await Promise.allSettled(
    tasks
      .filter((t) => !t.parentId)
      .map((t) => apiRequest("DELETE", "/api/tasks", { id: t.id }, user1Auth.token)),
  );
});

// ---------------------------------------------------------------------------
// Visual language — core regression suite.
// Prevents the "grey box" revert from going unnoticed.
// ---------------------------------------------------------------------------

test.describe("task detail — visual language", () => {
  test("description field has no box styling", async ({ user1Page: page }) => {
    await createTask(page, "Test task");
    await page.waitForSelector("[data-task-id]");
    await openFirstTaskDetail(page);

    const textarea = drawer(page).locator('[data-slot="textarea"]').first();
    await expect(textarea).toBeVisible();

    const cls = (await textarea.getAttribute("class")) ?? "";
    // Must NOT have box-style classes
    expect(cls).not.toContain("bg-input");
    expect(cls).not.toContain("rounded-md");
    // Must have the underline-style classes from Textarea
    expect(cls).toContain("border-b");
    expect(cls).toContain("bg-transparent");
  });

  test("due date shows styled button, not a visible native date input", async ({
    user1Page: page,
  }) => {
    await createTask(page, "Test task");
    await page.waitForSelector("[data-task-id]");
    await openFirstTaskDetail(page);

    const d = drawer(page);

    // The hidden native input must be invisible and zero-size
    const hiddenInput = d.locator('input[type="date"]');
    await expect(hiddenInput).toBeAttached();
    const cls = (await hiddenInput.getAttribute("class")) ?? "";
    expect(cls).toContain("invisible");
    expect(cls).toContain("size-0");

    // The visible trigger is a button with aria-label
    await expect(d.getByRole("button", { name: "Set due date" })).toBeVisible();
    // "Set date…" placeholder visible when no date set
    await expect(d.getByText("Set date…")).toBeVisible();
  });

  test("section labels use text-hint, not text-muted-foreground", async ({ user1Page: page }) => {
    await createTask(page, "Test task");
    await page.waitForSelector("[data-task-id]");
    await openFirstTaskDetail(page);

    const d = drawer(page);

    for (const labelText of ["Description", "Due date", "Subtasks", "Notes"]) {
      const label = d.locator(`text=${labelText}`).first();
      await expect(label).toBeVisible();
      const cls = await label.evaluate((el) => el.className);
      expect(cls).toContain("text-hint");
      expect(cls).not.toContain("text-muted-foreground");
    }
  });

  test("delete button is a quiet text link, not a destructive Button variant", async ({
    user1Page: page,
  }) => {
    await createTask(page, "Test task");
    await page.waitForSelector("[data-task-id]");
    await openFirstTaskDetail(page);

    const deleteBtn = drawer(page).getByRole("button", { name: "Delete task" });
    await expect(deleteBtn).toBeVisible();

    const cls = (await deleteBtn.getAttribute("class")) ?? "";
    expect(cls).toContain("text-hint");
    expect(cls).toContain("hover:text-destructive");
    expect(cls).not.toContain("bg-destructive");
    // Must be a plain <button>, not the Button component wrapper
    const slot = await deleteBtn.getAttribute("data-slot");
    expect(slot).not.toBe("button");
  });

  test("title input is an Input primitive (underline, no box)", async ({ user1Page: page }) => {
    await createTask(page, "Test task");
    await page.waitForSelector("[data-task-id]");
    await openFirstTaskDetail(page);

    // The title input is accessible via its sr-only label; avoids matching
    // the subtask and note inputs that also carry data-slot="input".
    const titleInput = drawer(page).getByRole("textbox", { name: "Title" });
    await expect(titleInput).toBeVisible();

    const cls = (await titleInput.getAttribute("class")) ?? "";
    expect(cls).toContain("bg-transparent");
    expect(cls).not.toContain("bg-input");
    expect(cls).not.toContain("rounded-md");
  });

  test("share-with uses Base UI Select, not a native <select>", async ({
    user1Page: page,
    user1Auth,
    user2Auth,
  }) => {
    const { ensureMutualContacts } = await import("./helpers/api");
    await ensureMutualContacts(user1Auth.token, user2Auth.token);

    await createTask(page, "Shared task");
    await page.waitForSelector("[data-task-id]");
    await page.waitForTimeout(1000); // contacts collection hydrate
    await openFirstTaskDetail(page);

    // No raw <select> anywhere in the drawer
    await expect(drawer(page).locator("select")).toHaveCount(0);
    // Base UI Select trigger present
    await expect(drawer(page).locator('[data-slot="select-trigger"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Functional correctness
// ---------------------------------------------------------------------------

test.describe("task detail — functionality", () => {
  test("title edit saves on blur", async ({ user1Page: page }) => {
    await createTask(page, "Original title");
    await page.waitForSelector("[data-task-id]");
    await openFirstTaskDetail(page);

    const d = drawer(page);
    const titleInput = d.getByRole("textbox", { name: "Title" });
    await expect(titleInput).toBeVisible();
    await titleInput.click({ clickCount: 3 });
    await titleInput.fill("Updated title");

    // Blur by clicking the description area
    await d.locator('[data-slot="textarea"]').first().click();
    await page.waitForTimeout(400);

    // Title input should have the updated value
    await expect(titleInput).toHaveValue("Updated title");
  });

  test("due date can be cleared", async ({ user1Page: page }) => {
    await createTask(page, "Task with date");
    await page.waitForSelector("[data-task-id]");
    await openFirstTaskDetail(page);

    const d = drawer(page);

    // Set a date programmatically on the drawer-scoped hidden input
    await page.evaluate(() => {
      const input = document.querySelector(
        '[data-slot="drawer-content"] input[type="date"]',
      ) as HTMLInputElement | null;
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "2025-12-31");
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(400);

    const clearBtn = d.getByRole("button", { name: "clear" });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await page.waitForTimeout(300);
    await expect(clearBtn).not.toBeVisible();
    await expect(d.getByText("Set date…")).toBeVisible();
  });

  test("delete task closes drawer and removes task from list", async ({ user1Page: page }) => {
    await createTask(page, "Task to delete");
    await page.waitForSelector("[data-task-id]");
    const tasksBefore = await page.locator("[data-task-id]").count();

    await openFirstTaskDetail(page);
    await drawer(page).getByRole("button", { name: "Delete task" }).click();
    await page.waitForTimeout(500);

    // Drawer dismissed
    await expect(page.locator('[data-slot="drawer-content"]')).not.toBeVisible();
    // One fewer task
    await expect(page.locator("[data-task-id]")).toHaveCount(tasksBefore - 1);
  });

  test("description saves on blur", async ({ user1Page: page }) => {
    await createTask(page, "Task with description");
    await page.waitForSelector("[data-task-id]");
    await openFirstTaskDetail(page);

    const d = drawer(page);
    const desc = d.locator('[data-slot="textarea"]').first();
    await desc.click();
    await desc.fill("My description");

    // Explicit blur before closing
    await desc.blur();
    await page.waitForTimeout(500);

    // Close drawer and wait for it to fully detach (close animation is ~400ms)
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-slot="drawer-content"]', {
      state: "detached",
      timeout: 3000,
    });

    // Reopen and verify persistence
    await openFirstTaskDetail(page);
    await expect(d.locator('[data-slot="textarea"]').first()).toHaveValue("My description");
  });
});
