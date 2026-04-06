import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getOrCreateUser, signIn } from "./helpers/auth";
import { USER_1 } from "./helpers/users";

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
  await signIn(page, await getOrCreateUser(USER_1));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await checkContrast(page);
});
