import { test, expect, type Page } from "@playwright/test";
import { loginResidentByCode, loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const adminCode = process.env.TEST_ADMIN_CODE || "1233";

test.describe("Role-based access", () => {
  test.use({ storageState: undefined });

  test("resident accesses cabinet, blocked from admin", async ({ page }: { page: Page }) => {
    await loginResidentByCode(page, "/cabinet");
    await page.goto(`${base}/cabinet`);
    await expect(page).toHaveURL(/\/cabinet/);
    await page.goto(`${base}/admin`);
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("chairman accesses office, blocked from admin", async ({ page }: { page: Page }) => {
    await loginStaff(page, "chairman", "/office");
    await page.goto(`${base}/office`);
    await expect(page).toHaveURL(/\/office/);
    await page.goto(`${base}/admin`);
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("secretary cannot open finance", async ({ page }: { page: Page }) => {
    await loginStaff(page, "secretary", "/office");
    await page.goto(`${base}/office/finance`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("accountant cannot open appeals", async ({ page }: { page: Page }) => {
    const ok = await loginStaff(page, "accountant", "/office");
    test.skip(!ok, "No accountant creds in local env");
    await page.goto(`${base}/office/appeals`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("admin accesses admin", async ({ page }: { page: Page }) => {
    await page.goto(`${base}/login?next=/admin`);
    await page.getByTestId("login-access-code").fill(adminCode);
    await page.getByTestId("login-submit").click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await page.goto(`${base}/admin`);
    await expect(page).toHaveURL(/\/admin/);
  });

  test("admin menu visible on home", async ({ page }: { page: Page }) => {
    await page.goto(`${base}/login?next=/`);
    await page.getByTestId("login-access-code").fill(adminCode);
    await page.getByTestId("login-submit").click();
    await page.waitForURL(/\/$/, { timeout: 15000 });
    await page.goto(`${base}/`);
    await page.getByRole("button", { name: /аккаунт/i }).click();
    const adminLink = page.locator('a[href="/admin"]').first();
    await expect(adminLink).toBeVisible();
  });
});
