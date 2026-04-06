import type { Page } from "@playwright/test";

/** Navigates to "/" and waits until the task input is interactive. */
export const waitForAppReady = async (page: Page): Promise<void> => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#add-task-input", { timeout: 10000 });
};

/** Types text into the task input and submits. */
export const createTask = async (page: Page, text: string): Promise<void> => {
  await page.fill("#add-task-input", text);
  await page.keyboard.press("Enter");
};

/**
 * Creates a category via the add-category form.
 * - "sidebar" context: used on desktop (pointer:fine)
 * - "sheet" context: used on mobile (pointer:coarse) — the bottom sheet must
 *   already be open before calling this
 */
export const createCategory = async (
  page: Page,
  name: string,
  context: "sidebar" | "sheet",
): Promise<void> => {
  if (context === "sidebar") {
    await page.getByTestId("category-sidebar").getByLabel("Add category").click();
    await page.locator('input[placeholder="Name..."]').fill(name);
  } else {
    await page.getByRole("button", { name: "Add category" }).tap();
    await page.locator('input[placeholder="Category name..."]').fill(name);
  }
  await page.keyboard.press("Enter");
};

/** Clears localStorage — useful in afterEach to reset auth state. */
export const clearLocalStorage = async (page: Page): Promise<void> => {
  await page.evaluate(() => localStorage.clear());
};

/** Deletes all IndexedDB databases — use to wipe OPFS/TanStack DB between tests. */
export const clearIDB = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(({ name }) =>
        name
          ? new Promise<void>((res, rej) => {
              const req = indexedDB.deleteDatabase(name);
              req.onsuccess = () => res();
              req.onerror = () => rej(req.error);
            })
          : Promise.resolve(),
      ),
    );
  });
};
