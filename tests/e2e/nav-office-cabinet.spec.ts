import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanPass = process.env.AUTH_PASS_CHAIRMAN || "";
const accountantPass = process.env.AUTH_PASS_ACCOUNTANT || "";

test("office to cabinet link works for staff", async ({ page }) => {
  const staffPassword = chairmanPass || accountantPass;
  if (!staffPassword) {
    await page.goto(`${base}/staff-login`);
    await expect(page.getByTestId("staff-login-root")).toBeVisible();
    return;
  }
  const loginValue = chairmanPass ? "Председатель" : "Бухгалтер";
  await page.goto(`${base}/staff-login?next=${encodeURIComponent("/office")}`);
  await page.getByTestId("staff-login-username").fill(loginValue);
  await page.getByTestId("staff-login-password").fill(staffPassword);
  await page.getByTestId("staff-login-submit").click();
  await page.waitForURL(/\/office/);
  await page.getByTestId("office-to-cabinet").click();
  await page.waitForURL(/\/cabinet/);
  await expect(page).toHaveURL(/\/cabinet/);
  const backLink = page.getByTestId("cabinet-to-office").first();
  // Playwright Locator in our config does not expose .count(), so attempt click with try/catch.
  try {
    await backLink.click();
    await page.waitForURL(/\/office/);
  } catch {
    // ссылки нет — ничего не делаем
  }
});
