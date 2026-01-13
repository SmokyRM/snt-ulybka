import { test, expect, type Page } from "@playwright/test";
import { loginResidentByCode, loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const adminCode = process.env.TEST_ADMIN_CODE || "1233";
const residentCode = process.env.TEST_RESIDENT_CODE || "1111";
const chairmanCode = process.env.TEST_CHAIRMAN_CODE || "2222";
const secretaryCode = process.env.TEST_SECRETARY_CODE || "3333";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";

async function loginWithCode(page: Page, code: string, next: string) {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
  await page.getByTestId("login-access-code").fill(code);
  const urlPattern = new RegExp(next.replace("/", "\\/") + "(\\/|$)", "i");
  await Promise.all([
    page.waitForURL(urlPattern, { timeout: 15000 }),
    page.getByTestId("login-submit").click(),
  ]);
}

test.describe("Role-based access", () => {
  test("resident accesses cabinet, blocked from admin", async ({ page }: { page: Page }) => {
    await loginWithCode(page, residentCode, "/cabinet");
    await page.goto(`${base}/cabinet`);
    await expect(page).toHaveURL(/\/cabinet/);
    await page.goto(`${base}/admin`);
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("chairman accesses office, blocked from admin", async ({ page }: { page: Page }) => {
    await loginWithCode(page, chairmanCode, "/office");
    await page.goto(`${base}/office`);
    await expect(page).toHaveURL(/\/office/);
    await page.goto(`${base}/admin`);
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("secretary cannot open finance", async ({ page }: { page: Page }) => {
    await loginWithCode(page, secretaryCode, "/office/finance");
    await page.goto(`${base}/office/finance`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("accountant cannot open appeals", async ({ page }: { page: Page }) => {
    await loginWithCode(page, accountantCode, "/office/appeals");
    await page.goto(`${base}/office/appeals`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("admin accesses admin", async ({ page }: { page: Page }) => {
    await loginWithCode(page, adminCode, "/admin");
    await page.goto(`${base}/admin`);
    await expect(page).toHaveURL(/\/admin/);
  });

  test("admin menu visible on home", async ({ page }: { page: Page }) => {
    await loginWithCode(page, adminCode, "/");
    await page.goto(`${base}/`);
    await page.getByRole("button", { name: /аккаунт/i }).click();
    await expect(page.getByRole("link", { name: /в админку/i })).toBeVisible();
  });
});
