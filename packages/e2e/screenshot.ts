import { chromium } from "@playwright/test";
import { forBothViewports, reportViolations, type A11yViolation } from "./helpers/screenshot";
import { getOrCreateUser, signIn } from "./helpers/auth";
import { USER_1 } from "./helpers/users";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const OUT_DIR = process.env.SCREENSHOT_DIR || ".";

const browser = await chromium.launch();
const a11yViolations: A11yViolation[] = [];

console.log("Taking screenshots...");

// 1. First-run / empty state (no auth, no tasks)
await forBothViewports(browser, OUT_DIR, "screenshot-empty", async (page) => {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
}, a11yViolations);

// 2. Auth page
await forBothViewports(browser, OUT_DIR, "screenshot-auth", async (page) => {
  await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
}, a11yViolations);

// 3. Logged-in with tasks
const user1Auth = await getOrCreateUser(USER_1);
await forBothViewports(browser, OUT_DIR, "screenshot-tasks", async (page) => {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await signIn(page, user1Auth);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
}, a11yViolations);

await browser.close();

const exitCode = reportViolations(a11yViolations);
console.log("Done.");
process.exit(exitCode);
