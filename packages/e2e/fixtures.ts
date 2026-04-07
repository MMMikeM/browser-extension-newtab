import { test as base, type Page } from "@playwright/test";
import { getOrCreateUser, signIn, type AuthResult } from "./helpers/auth";
import { waitForAppReady } from "./helpers/app";
import { createSyncTracker, type SyncTracker } from "./helpers/sync";
import { USER_1, USER_2 } from "./helpers/users";

type Fixtures = {
  /** Navigated to "/" and ready — use for unauthenticated tests. */
  appPage: Page;
  /** Resolved credentials for USER_1 (created on first run, reused thereafter). */
  user1Auth: AuthResult;
  /** Resolved credentials for USER_2 (created on first run, reused thereafter). */
  user2Auth: AuthResult;
  /** Page signed in as USER_1 in the default browser context. */
  user1Page: Page;
  /**
   * Page signed in as USER_2 in an isolated browser context.
   * Use together with user1Page to test cross-user interactions — localStorage
   * is not shared between the two contexts.
   */
  user2Page: Page;
  /**
   * Tracks all non-GET /api/* requests made against `page`.
   * Calls assertNoFailures() automatically in teardown.
   */
  syncTracker: SyncTracker;
};

export const test = base.extend<Fixtures>({
  appPage: async ({ page }, use) => {
    await waitForAppReady(page);
    await use(page);
  },

  // eslint-disable-next-line no-empty-pattern
  user1Auth: async ({}, use) => {
    await use(await getOrCreateUser(USER_1));
  },

  // eslint-disable-next-line no-empty-pattern
  user2Auth: async ({}, use) => {
    await use(await getOrCreateUser(USER_2));
  },

  user1Page: async ({ page, user1Auth }, use) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await signIn(page, user1Auth);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#add-task-input", { timeout: 10000 });
    await use(page);
  },

  user2Page: async ({ browser, user2Auth }, use) => {
    // Separate context so USER_2's localStorage is isolated from USER_1's.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await signIn(page, user2Auth);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#add-task-input", { timeout: 10000 });
    await use(page);
    await context.close();
  },

  syncTracker: async ({ page }, use) => {
    const tracker = createSyncTracker(page);
    await use(tracker);
    tracker.assertNoFailures();
  },
});

export { expect } from "@playwright/test";
