import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AUTH_TOKEN = process.env.AUTH_TOKEN || "dev-token-change-me";

// Seed localStorage so the app treats the session as authenticated
async function seedAuth(page: Page) {
  await page.evaluate((token) => {
    localStorage.setItem("newtab-todo-token", token);
    localStorage.setItem("newtab-todo-user-id", "sdcuvncpvl1i9vpch303nynb");
    localStorage.setItem(
      "newtab-todo-user-info",
      JSON.stringify({ id: "sdcuvncpvl1i9vpch303nynb", name: "Mike", username: "mike" }),
    );
    localStorage.setItem("newtab-todo-active-category", "cat-work");
  }, AUTH_TOKEN);
}

async function checkContrast(page: Page) {
  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  expect(
    results.violations,
    results.violations
      .flatMap((v) => v.nodes.map((n) => `${n.failureSummary}\n  ${n.html.slice(0, 200)}`))
      .join("\n\n"),
  ).toHaveLength(0);
}

test("empty state — no contrast violations", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await checkContrast(page);
});

test("auth page — no contrast violations", async ({ page }) => {
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await checkContrast(page);
});

test("logged-in with tasks — no contrast violations", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await seedAuth(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await checkContrast(page);
});
