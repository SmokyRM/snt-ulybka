import { test, expect, type Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const TEST_CODE = process.env.TEST_ACCESS_CODE || "1111";

test("login and save state", async ({ page }: { page: Page }) => {
  await page.goto(`${baseURL}/login?next=/cabinet`);
  await page.getByTestId("login-access-code").fill(TEST_CODE);
  await page.getByTestId("login-submit").click();
  await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/cabinet/);
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: "playwright/.auth/state.json" });
});
