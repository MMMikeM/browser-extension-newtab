import type { Page } from "@playwright/test";

export const waitForAppReady = async (page: Page): Promise<void> => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#add-task-input", { timeout: 10000 });
};

export const createTask = async (page: Page, text: string): Promise<void> => {
  await page.fill("#add-task-input", text);
  await page.keyboard.press("Enter");
};

/** `"sidebar"` is the desktop form; `"sheet"` is the touch one, which must already be open. */
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

export const clearLocalStorage = async (page: Page): Promise<void> => {
  await page.evaluate(() => localStorage.clear());
};

/** Clears the offline outbox, which lives in IndexedDB. Collections persist in OPFS and survive this. */
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
