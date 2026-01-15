import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanPass = process.env.AUTH_PASS_CHAIRMAN || "";
const accountantPass = process.env.AUTH_PASS_ACCOUNTANT || "";
const secretaryPass = process.env.AUTH_PASS_SECRETARY || "";

test("staff-login cookie grants access to office", async ({ page }) => {
  const password = chairmanPass || accountantPass || secretaryPass;
  if (!password) {
    await page.goto(`${base}/staff-login`);
    await expect(page.getByTestId("staff-login-root")).toBeVisible();
    return;
  }
  const loginValue = chairmanPass
    ? "Председатель"
    : accountantPass
      ? "Бухгалтер"
      : "Секретарь";

  await page.goto(`${base}/staff-login?next=${encodeURIComponent("/office")}`);
  await page.getByTestId("staff-login-username").fill(loginValue);
  await page.getByTestId("staff-login-password").fill(password);
  await page.getByTestId("staff-login-submit").click();
  await page.waitForURL(/\/office/);
  await expect(page.getByTestId("office-nav")).toBeVisible();
});
