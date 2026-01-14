import { test, expect, type Page } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";
const residentCode = process.env.TEST_ACCESS_CODE || "1111";

async function login(page: Page, code: string, next: string) {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel(/код доступа/i).fill(code);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL(/^(?!.*login).*$/);
}

test.describe("Office registry", () => {
  test("accountant can open registry and item", async ({ page }) => {
    await login(page, accountantCode, "/office/registry");
    await page.goto(`${base}/office/registry`);
    await expect(page.getByTestId("office-registry-root")).toBeVisible();
    const firstRow = page.getByTestId("registry-row").first();
    await firstRow.click();
    await expect(page).toHaveURL(new RegExp("/office/registry/"));
    await expect(page.getByTestId("office-registry-item-root")).toBeVisible();
    await page.getByTestId("registry-open-finance").click();
    await expect(page).toHaveURL(/\/office\/finance/);
  });

  test("resident gets forbidden", async ({ page }) => {
    await login(page, residentCode, "/office/registry");
    await page.goto(`${base}/office/registry`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
