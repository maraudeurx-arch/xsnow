import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT || "4173";
const host = process.env.E2E_HOST || "127.0.0.1";
const basePath = (process.env.E2E_BASE_PATH || "").replace(/\/+$/, "");
const iphone = devices["iPhone 12"];

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://${host}:${port}${basePath}/`,
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    userAgent: iphone.userAgent,
    isMobile: true,
    hasTouch: true,
    locale: "fr-CA",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/serve-e2e.mjs",
    url: `http://${host}:${port}${basePath}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium-390",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        userAgent: iphone.userAgent,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
});
