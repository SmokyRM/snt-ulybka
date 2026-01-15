import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000, // Increased for cold compile in Next.js dev
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 120_000,
    actionTimeout: 20_000,
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // Use explicit next dev without turbopack for stability
        command: "next dev",
        url: baseURL,
        reuseExistingServer: true, // Always reuse for local dev to avoid lock conflicts
        timeout: 120_000,
      },
  projects: [
    {
      name: "setup",
      testMatch: /(auth|warmup|roleStates)\.setup\.ts/,
    },
    {
      name: "chromium",
      // Default project without storageState (guest state)
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
    },
    {
      name: "chromium-resident",
      use: { storageState: "playwright/.auth/state.json" },
      dependencies: ["setup"],
      // Only tests that need resident state - specific files only
      testMatch: [
        /cabinet\.spec\.ts$/,
        /smoke-qa-cabinet-and-appeals\.spec\.ts$/,
      ],
    },
    {
      name: "access-matrix",
      // Dedicated project for access matrix tests - uses role-specific storage states
      testMatch: /access-matrix\.spec\.ts$/,
      dependencies: ["setup"],
    },
    {
      name: "smoke-routes",
      // Smoke routes tests - не требуют auth setup, работают с QA override или без
      testMatch: /smoke\.routes\.spec\.ts$/,
      dependencies: [], // Не требует setup - работает без auth
    },
  ],
});
