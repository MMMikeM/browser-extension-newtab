import { chromium, type Page } from "@playwright/test";
import { forBothViewports, reportViolations, type A11yViolation } from "./helpers/screenshot";
import { mockApi } from "./helpers/mock-api";

// Like screenshot.ts, but against mocked /api data: needs only the Vite dev server —
// no API server, database or test accounts.

const BASE_URL = "http://localhost:5173";
const OUT_DIR = process.env.SCREENSHOT_DIR || "./screenshots";

const isMobile = (page: Page) => page.viewportSize()?.width === 390;

const row = (page: Page, title: string) =>
  page.locator("[data-task-id]", { hasText: title }).first();

const openList = async (page: Page) => {
  await mockApi(page);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-task-id]", { timeout: 15000 });
  await page.waitForTimeout(600);
};

const openCategoryNav = async (page: Page) => {
  if (isMobile(page)) {
    await page.getByTestId("category-nav-trigger").click();
    return;
  }
  const pill = page.getByTestId("category-sidebar").locator(".group\\/pill").filter({ hasText: "Work" });
  await pill.hover();
  await pill.getByRole("button", { name: "Category options" }).click();
};

const scenes: Record<string, (page: Page) => Promise<void>> = {
  "mock-list": async (page) => {
    await openList(page);
    await page.mouse.move(0, 0);
  },
  "mock-row-hover": async (page) => {
    await openList(page);
    if (!isMobile(page)) await row(page, "Pick up dry cleaning").hover();
    await page.waitForTimeout(250);
  },
  "mock-detail": async (page) => {
    await openList(page);
    await row(page, "Book flights")
      .getByRole("button", { name: /^Book flights/ })
      .click();
    await page.waitForTimeout(800);
  },
  "mock-category-nav": async (page) => {
    await openList(page);
    await openCategoryNav(page);
    await page.waitForTimeout(500);
  },
  "mock-toast": async (page) => {
    await openList(page);
    await row(page, "Pick up dry cleaning").getByRole("checkbox").click();
    await page.waitForTimeout(900);
    await page.mouse.move(0, 0);
  },
  "mock-empty-list": async (page) => {
    await openList(page);
    if (isMobile(page)) {
      await page.getByTestId("category-nav-trigger").click();
      await page.getByRole("button", { name: /^Home/ }).first().click();
    } else {
      await page.getByTestId("category-sidebar").getByText("Home", { exact: true }).click();
    }
    await page.waitForTimeout(700);
  },
  "mock-people": async (page) => {
    await mockApi(page);
    await page.goto(`${BASE_URL}/people`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
  },
  "mock-auth": async (page) => {
    await mockApi(page, { signedIn: false });
    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
  },
};

const browser = await chromium.launch();
const a11yViolations: A11yViolation[] = [];

console.log("Taking mocked screenshots...");
for (const [name, setup] of Object.entries(scenes)) {
  await forBothViewports(browser, OUT_DIR, name, setup, a11yViolations);
}

await browser.close();

const exitCode = reportViolations(a11yViolations);
console.log("Done.");
process.exit(exitCode);
