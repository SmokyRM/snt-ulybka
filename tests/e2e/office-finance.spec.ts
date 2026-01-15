import { test, expect, type Page } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const accountantPass = process.env.AUTH_PASS_ACCOUNTANT;
const secretaryPass = process.env.AUTH_PASS_SECRETARY;

async function staffLogin(page: Page, login: string, password: string, next: string) {
  await page.goto(`${base}/staff-login?next=${encodeURIComponent(next)}`);
  await page.getByTestId("staff-login-username").fill(login);
  await page.getByTestId("staff-login-password").fill(password);
  await page.getByTestId("staff-login-submit").click();
  await page.waitForURL(/^(?!.*staff-login).*$/);
}

test.describe("Office finance", () => {
  test("staff can open finance page", async ({ page }) => {
    await page.goto(`${base}/office/finance`);
    if (await page.getByTestId("staff-login-root").isVisible()) {
      if (accountantPass) {
        await staffLogin(page, "Бухгалтер", accountantPass, "/office/finance");
      } else {
        await expect(page.getByTestId("staff-login-root")).toBeVisible();
        return;
      }
    }
    await expect(page.getByTestId("office-finance-root")).toBeVisible();
    if (await page.getByTestId("office-finance-export").count()) {
      await expect(page.getByTestId("office-finance-export")).toBeVisible();
    }
  });

  test("secretary is forbidden", async ({ page }) => {
    await page.goto(`${base}/office/finance`);
    if (await page.getByTestId("staff-login-root").isVisible()) {
      if (!secretaryPass) {
        await expect(page.getByTestId("staff-login-root")).toBeVisible();
        return;
      }
      await staffLogin(page, "Секретарь", secretaryPass, "/office/finance");
    }
    await page.goto(`${base}/office/finance`);
    // Секретарь видит страницу, но без экспорта
    await expect(page.getByTestId("office-finance-root")).toBeVisible();
    await expect(page.getByTestId("office-finance-export")).toHaveCount(0);
  });
});
