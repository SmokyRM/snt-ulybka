import { test, expect, type Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const TEST_CODE = process.env.TEST_ACCESS_CODE || "1111";

test("login and save state", async ({ page }: { page: Page }) => {
  await page.goto(`${baseURL}/login?next=/cabinet`);
  await page.getByTestId("login-access-code").fill(TEST_CODE);
  await Promise.all([
    page.waitForURL(/\/cabinet(\/|$)/, { timeout: 15000 }),
    page.getByTestId("login-submit").click(),
  ]);
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: "playwright/.auth/state.json" });
});
