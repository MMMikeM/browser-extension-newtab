import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUT = process.env.SCREENSHOT_OUT || "screenshot.png";
const AUTH_TOKEN = process.env.AUTH_TOKEN || "dev-token-change-me";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  colorScheme: "dark",
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

// Navigate first so localStorage is on the right origin, then seed it
await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
await page.evaluate((token) => {
  localStorage.setItem("newtab-todo-token", token);
  localStorage.setItem("newtab-todo-user-id", "sdcuvncpvl1i9vpch303nynb");
  localStorage.setItem("newtab-todo-active-category", "cat-work");
}, AUTH_TOKEN);

// Reload so the app picks up the token and syncs
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

await page.screenshot({ path: OUT, fullPage: false });
await browser.close();
console.log(`Screenshot saved to ${OUT}`);
