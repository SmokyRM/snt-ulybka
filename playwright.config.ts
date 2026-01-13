import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL,
    headless: true,
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { storageState: "playwright/.auth/state.json" },
      dependencies: ["setup"],
      testMatch: /.*\.spec\.ts/,
    },
  ],
});
