import { test, expect, type Page } from "@playwright/test";

const TEST_CODE = process.env.TEST_ACCESS_CODE || "1111";

test("home ctas and login redirect", async ({ page }: { page: Page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  await page.goto(base + "/");
  await expect(page.getByTestId("home-cta-login")).toBeVisible();
  await expect(page.getByTestId("home-cta-get-access")).toBeVisible();
  await page.getByTestId("home-cta-login").click();
  await expect(page).toHaveURL(/\/login/);
});

test("login invalid code shows error", async ({ page }: { page: Page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  await page.goto(base + "/login");
  await page.getByTestId("login-access-code").fill("9999");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("login-error-block")).toBeVisible();
  await expect(page.getByTestId("login-error-text")).toBeVisible();
});

test("login with next redirects to announcements", async ({ page }: { page: Page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  await page.goto(base + "/login?next=/cabinet/announcements");
  await page.getByTestId("login-access-code").fill(TEST_CODE);
  await page.getByTestId("login-submit").click();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/cabinet\/announcements/);
  await expect(page.getByTestId("cabinet-announcements-root")).toBeVisible();
  await expect(page.getByTestId("cabinet-announcements-root")).not.toContainText("Что-то пошло не так");
});
