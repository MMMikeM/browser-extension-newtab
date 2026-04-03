import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = process.env.SCREENSHOT_DIR || ".";
const AUTH_TOKEN = process.env.AUTH_TOKEN || "dev-token-change-me";

const browser = await chromium.launch();

const screenshot = async (
  name: string,
  setup: (page: Awaited<ReturnType<typeof browser.newContext>>["pages"] extends (infer P)[] ? P : never) => Promise<void>,
) => {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: "dark",
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await setup(page);
  const path = `${OUT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  ${path}`);
  await ctx.close();
};

console.log("Taking screenshots...");

// 1. First-run / empty state (no auth, no tasks)
await screenshot("screenshot-empty", async (page) => {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
});

// 2. Auth page
await screenshot("screenshot-auth", async (page) => {
  await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
});

// 3. Logged-in with tasks
await screenshot("screenshot-tasks", async (page) => {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate((token) => {
    localStorage.setItem("newtab-todo-token", token);
    localStorage.setItem("newtab-todo-user-id", "sdcuvncpvl1i9vpch303nynb");
    localStorage.setItem(
      "newtab-todo-user-info",
      JSON.stringify({ id: "sdcuvncpvl1i9vpch303nynb", name: "Mike", username: "mike" }),
    );
    localStorage.setItem("newtab-todo-active-category", "cat-work");
  }, AUTH_TOKEN);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
});

await browser.close();
console.log("Done.");
