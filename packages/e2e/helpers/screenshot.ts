import { type Browser, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 }, // iPhone 14
} as const;

export type Viewport = keyof typeof VIEWPORTS;
export type ScreenshotSetup = (page: Page) => Promise<void>;
export type A11yViolation = { url: string; viewport: Viewport; violations: unknown[] };

/**
 * Takes a screenshot at the given viewport and runs an axe color-contrast audit.
 * Violations are appended to the `violations` array (not thrown) so a caller
 * can collect them across multiple screenshots and report them all at once.
 */
export const takeScreenshot = async (
  browser: Browser,
  outDir: string,
  name: string,
  viewport: Viewport,
  setup: ScreenshotSetup,
  violations: A11yViolation[],
): Promise<void> => {
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[viewport],
    colorScheme: "dark",
    deviceScaleFactor: 2,
    isMobile: viewport === "mobile",
    hasTouch: viewport === "mobile",
  });
  const page = await ctx.newPage();
  await setup(page);

  const path = `${outDir}/${name}-${viewport}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  ${path}`);

  const results = await new AxeBuilder({ page: page as Page })
    .withRules(["color-contrast"])
    .analyze();
  if (results.violations.length > 0) {
    violations.push({ url: page.url(), viewport, violations: results.violations });
  }

  await ctx.close();
};

/** Convenience wrapper that captures both desktop and mobile in parallel. */
export const forBothViewports = async (
  browser: Browser,
  outDir: string,
  name: string,
  setup: ScreenshotSetup,
  violations: A11yViolation[],
): Promise<void> => {
  await Promise.all([
    takeScreenshot(browser, outDir, name, "desktop", setup, violations),
    takeScreenshot(browser, outDir, name, "mobile", setup, violations),
  ]);
};

/** Prints a11y violation details and returns the exit code (0 = clean). */
export const reportViolations = (violations: A11yViolation[]): number => {
  if (violations.length === 0) {
    console.log("  ✓ No contrast violations detected");
    return 0;
  }

  console.warn(`\n⚠️  Contrast violations found across ${violations.length} page(s):`);
  for (const { url, viewport, violations: vs } of violations) {
    console.warn(`  [${viewport}] ${url}`);
    for (const v of vs as { id: string; nodes: { html: string; failureSummary: string }[] }[]) {
      for (const node of v.nodes) {
        console.warn(`    • ${node.failureSummary.split("\n")[0]}`);
        console.warn(`      ${node.html.slice(0, 120)}`);
      }
    }
  }
  return 1;
};
