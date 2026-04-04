import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  outputDir: ".output",
  snapshotDir: ".snapshots",

  // Fail fast on CI; run all locally
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [["list"], ["html", { outputFolder: ".report", open: "never" }]],

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5173",
    colorScheme: "dark",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 14"],
        // Use Chromium for mobile emulation — avoids needing WebKit installed
        browserName: "chromium",
      },
    },
  ],
});
