import { chromium, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const OUT_DIR = process.env.SCREENSHOT_DIR || ".";
const AUTH_TOKEN = process.env.AUTH_TOKEN || "dev-token-change-me";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile:  { width: 390,  height: 844 }, // iPhone 14
};

const browser = await chromium.launch();

const a11yViolations: { url: string; viewport: string; violations: unknown[] }[] = [];

const screenshot = async (
  name: string,
  viewport: keyof typeof VIEWPORTS,
  setup: (
    page: Awaited<ReturnType<typeof browser.newContext>>["pages"] extends (infer P)[] ? P : never,
  ) => Promise<void>,
) => {
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[viewport],
    colorScheme: "dark",
    deviceScaleFactor: 2,
    isMobile: viewport === "mobile",
    hasTouch: viewport === "mobile",
  });
  const page = await ctx.newPage();
  await setup(page);

  // Capture screenshot
  const path = `${OUT_DIR}/${name}-${viewport}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  ${path}`);

  // Run axe audit — report colour-contrast violations only
  const results = await new AxeBuilder({ page: page as Page })
    .withRules(["color-contrast"])
    .analyze();
  if (results.violations.length > 0) {
    a11yViolations.push({ url: page.url(), viewport, violations: results.violations });
  }

  await ctx.close();
};

const forBothViewports = async (
  name: string,
  setup: Parameters<typeof screenshot>[2],
) => {
  await Promise.all([
    screenshot(name, "desktop", setup),
    screenshot(name, "mobile", setup),
  ]);
};

console.log("Taking screenshots...");

// 1. First-run / empty state (no auth, no tasks)
await forBothViewports("screenshot-empty", async (page) => {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
});

// 2. Auth page
await forBothViewports("screenshot-auth", async (page) => {
  await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
});

// 3. Logged-in with tasks
await forBothViewports("screenshot-tasks", async (page) => {
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

// Report contrast violations
if (a11yViolations.length === 0) {
  console.log("  ✓ No contrast violations detected");
} else {
  console.warn(`\n⚠️  Contrast violations found across ${a11yViolations.length} page(s):`);
  for (const { url, viewport, violations } of a11yViolations) {
    console.warn(`  [${viewport}] ${url}`);
    for (const v of violations as { id: string; nodes: { html: string; failureSummary: string }[] }[]) {
      for (const node of v.nodes) {
        console.warn(`    • ${node.failureSummary.split("\n")[0]}`);
        console.warn(`      ${node.html.slice(0, 120)}`);
      }
    }
  }
}

console.log("Done.");
