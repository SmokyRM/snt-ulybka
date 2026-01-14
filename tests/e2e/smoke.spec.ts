import { test, expect, type Page } from "@playwright/test";
import { loginResidentByCode, loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const adminCode = process.env.TEST_ADMIN_CODE || "1233";

test.describe("Smoke tests - basic page rendering", () => {
  test("login page renders", async ({ page }: { page: Page }) => {
    await page.goto(`${base}/login`);
    await expect(page.getByTestId("login-form")).toBeVisible();
    await expect(page.getByTestId("login-access-code")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
  });

  test("staff-login page renders", async ({ page }: { page: Page }) => {
    await page.goto(`${base}/staff-login`);
    await expect(page.getByTestId("staff-login-root")).toBeVisible();
    await expect(page.getByTestId("staff-login-username")).toBeVisible();
    await expect(page.getByTestId("staff-login-password")).toBeVisible();
    await expect(page.getByTestId("staff-login-submit")).toBeVisible();
  });

  test("forbidden page renders with CTA", async ({ page }: { page: Page }) => {
    await page.goto(`${base}/forbidden`);
    await expect(page.getByTestId("forbidden-root")).toBeVisible();
    await expect(page.getByTestId("forbidden-cta-home")).toBeVisible();
    await expect(page.getByTestId("forbidden-cta-staff-login")).toBeVisible();
    await expect(page.getByTestId("forbidden-cta-resident-login")).toBeVisible();
  });

  test("staff login -> office dashboard shows root", async ({ page }: { page: Page }) => {
    const ok = await loginStaff(page, "chairman", "/office");
    test.skip(!ok, "No chairman creds in local env");
    await expect(page.getByTestId("office-dashboard-root")).toBeVisible();
  });

  test("resident login -> cabinet shows root", async ({ page }: { page: Page }) => {
    await loginResidentByCode(page, "/cabinet");
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/cabinet/);
    const pathname = new URL(page.url()).pathname;
    if (pathname !== "/cabinet" && pathname !== "/cabinet/") {
      await page.goto(`${base}/cabinet`);
      await expect.poll(() => new URL(page.url()).pathname).toBe("/cabinet");
    }
    await expect(page.getByTestId("cabinet-root")).toBeVisible({ timeout: 15000 });
  });

  test("admin login -> admin shows root", async ({ page }: { page: Page }) => {
    await page.goto(`${base}/login?next=/admin`);
    await page.getByTestId("login-access-code").fill(adminCode);
    await page.getByTestId("login-submit").click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await expect(page.getByTestId("admin-root")).toBeVisible();
  });
});
