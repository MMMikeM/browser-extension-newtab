import { chromium } from "@playwright/test";
import { forBothViewports, reportViolations, type A11yViolation } from "./helpers/screenshot";
import { getOrCreateUser, signIn } from "./helpers/auth";
import { ensureMutualContacts } from "./helpers/api";
import { USER_1, USER_2 } from "./helpers/users";

const BASE_URL = "http://localhost:5173";
const OUT_DIR = process.env.SCREENSHOT_DIR || "./screenshots";

const browser = await chromium.launch();
const a11yViolations: A11yViolation[] = [];

console.log("Taking screenshots...");

await forBothViewports(
  browser,
  OUT_DIR,
  "screenshot-empty",
  async (page) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
  },
  a11yViolations,
);

await forBothViewports(
  browser,
  OUT_DIR,
  "screenshot-auth",
  async (page) => {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
  },
  a11yViolations,
);

// So the sharing UI shows the contacts picker
const user1Auth = await getOrCreateUser(USER_1);
const user2Auth = await getOrCreateUser(USER_2);
await ensureMutualContacts(user1Auth.token, user2Auth.token);

await forBothViewports(
  browser,
  OUT_DIR,
  "screenshot-tasks",
  async (page) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await signIn(page, user1Auth);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
  },
  a11yViolations,
);

await forBothViewports(
  browser,
  OUT_DIR,
  "screenshot-task-detail",
  async (page) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await signIn(page, user1Auth);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#add-task-input", { timeout: 10000 });
    await page.waitForTimeout(1500); // let contacts collection hydrate
    const tasks = page.locator("[data-task-id]");
    if ((await tasks.count()) === 0) {
      await page.fill("#add-task-input", "Review quarterly goals");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
    }
    await page.locator("[data-task-id]").first().click();
    await page.waitForTimeout(800);
  },
  a11yViolations,
);

await forBothViewports(
  browser,
  OUT_DIR,
  "screenshot-category-share",
  async (page) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await signIn(page, user1Auth);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#add-task-input", { timeout: 10000 });
    await page.waitForTimeout(1500);

    const isMobile = page.viewportSize()?.width === 390;

    if (isMobile) {
      await page.getByTestId("category-nav-trigger").tap();
      await page.waitForTimeout(400);
      const catOptions = page.locator('[aria-label="Category options"]');
      if ((await catOptions.count()) === 0) {
        await page.getByRole("button", { name: "Add category" }).tap();
        await page.locator('input[placeholder="Category name..."]').fill("Work");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(400);
        await page.getByTestId("category-nav-trigger").tap();
        await page.waitForTimeout(400);
      }
      await catOptions.first().tap();
      await page.waitForTimeout(300);
      // page.evaluate bypasses inert/overlay interception — dispatches directly on the element
      await page.evaluate(() =>
        (document.querySelector('[data-testid="category-share-btn"]') as HTMLElement)?.click(),
      );
      await page.waitForTimeout(600);
    } else {
      const sidebar = page.getByTestId("category-sidebar");
      const pills = sidebar.locator(".group\\/pill");
      if ((await pills.count()) === 0) {
        await sidebar.getByLabel("Add category").click();
        await page.locator('input[placeholder="Name..."]').fill("Work");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(400);
      }
      const pill = sidebar.locator(".group\\/pill").first();
      await pill.hover();
      await page.waitForTimeout(200);
      await pill.locator('[aria-label="Category options"]').click();
      await page.waitForTimeout(300);
      // page.evaluate bypasses inert/overlay interception — dispatches directly on the element
      await page.evaluate(() =>
        (document.querySelector('[data-testid="category-share-btn"]') as HTMLElement)?.click(),
      );
      await page.waitForTimeout(600);
    }
  },
  a11yViolations,
);

await browser.close();

const exitCode = reportViolations(a11yViolations);
console.log("Done.");
process.exit(exitCode);
