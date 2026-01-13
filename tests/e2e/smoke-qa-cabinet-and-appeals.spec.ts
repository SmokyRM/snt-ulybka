import { expect, test } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanPass = process.env.AUTH_PASS_CHAIRMAN || "";
const accountantPass = process.env.AUTH_PASS_ACCOUNTANT || "";

test("QA staff can open cabinet and appeal details", async ({ page }) => {
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

  // Кабинет не должен отдавать forbidden даже для staff.
  await page.goto(`${base}/cabinet?qa=chairman`);
  await expect(page).not.toHaveURL(/forbidden/);
  await expect(
    page.locator('[data-testid="cabinet-staff-no-resident"], [data-testid="cabinet-verification-root"]')
  ).toBeVisible();

  // Детали заявки открываются из списка.
  await page.goto(`${base}/office/appeals?qa=chairman`);
  await expect(page.getByTestId("office-appeals-root")).toBeVisible();

  const firstItem = page.locator('[data-testid^="office-appeals-item-"]').first();
  await firstItem.click();
  await expect(page.getByTestId("office-appeal-root")).toBeVisible();
  await expect(page).toHaveURL(/\/office\/appeals\//);
});
