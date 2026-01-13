import { test, expect, type Page } from "@playwright/test";
<<<<<<< HEAD
import { loginResidentByCode, loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const adminCode = process.env.TEST_ADMIN_CODE || "1233";

test.describe("Role-based access", () => {
  test.use({ storageState: undefined });

  test("resident accesses cabinet, blocked from admin", async ({ page }: { page: Page }) => {
    await loginResidentByCode(page, "/cabinet");
=======

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const adminCode = process.env.TEST_ADMIN_CODE || "1233";
const residentCode = process.env.TEST_RESIDENT_CODE || "1111";
const chairmanCode = process.env.TEST_CHAIRMAN_CODE || "2222";
const secretaryCode = process.env.TEST_SECRETARY_CODE || "3333";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";

async function loginWithCode(page: Page, code: string, next: string) {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel(/код доступа/i).fill(code);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL(/^(?!.*login).*$/);
}

test.describe("Role-based access", () => {
  test("resident accesses cabinet, blocked from admin", async ({ page }: { page: Page }) => {
    await loginWithCode(page, residentCode, "/cabinet");
>>>>>>> 737c5be (codex snapshot)
    await page.goto(`${base}/cabinet`);
    await expect(page).toHaveURL(/\/cabinet/);
    await page.goto(`${base}/admin`);
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("chairman accesses office, blocked from admin", async ({ page }: { page: Page }) => {
<<<<<<< HEAD
    await loginStaff(page, "chairman", "/office");
=======
    await loginWithCode(page, chairmanCode, "/office");
>>>>>>> 737c5be (codex snapshot)
    await page.goto(`${base}/office`);
    await expect(page).toHaveURL(/\/office/);
    await page.goto(`${base}/admin`);
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("secretary cannot open finance", async ({ page }: { page: Page }) => {
<<<<<<< HEAD
    await loginStaff(page, "secretary", "/office");
=======
    await loginWithCode(page, secretaryCode, "/office/finance");
>>>>>>> 737c5be (codex snapshot)
    await page.goto(`${base}/office/finance`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("accountant cannot open appeals", async ({ page }: { page: Page }) => {
<<<<<<< HEAD
    const ok = await loginStaff(page, "accountant", "/office");
    test.skip(!ok, "No accountant creds in local env");
=======
    await loginWithCode(page, accountantCode, "/office/appeals");
>>>>>>> 737c5be (codex snapshot)
    await page.goto(`${base}/office/appeals`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("admin accesses admin", async ({ page }: { page: Page }) => {
<<<<<<< HEAD
    await page.goto(`${base}/login?next=/admin`);
    await page.getByTestId("login-access-code").fill(adminCode);
    await page.getByTestId("login-submit").click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
=======
    await loginWithCode(page, adminCode, "/admin");
>>>>>>> 737c5be (codex snapshot)
    await page.goto(`${base}/admin`);
    await expect(page).toHaveURL(/\/admin/);
  });

  test("admin menu visible on home", async ({ page }: { page: Page }) => {
<<<<<<< HEAD
    await page.goto(`${base}/login?next=/`);
    await page.getByTestId("login-access-code").fill(adminCode);
    await page.getByTestId("login-submit").click();
    await page.waitForURL(/\/$/, { timeout: 15000 });
    await page.goto(`${base}/`);
    await page.getByRole("button", { name: /аккаунт/i }).click();
    const adminLink = page.locator('a[href="/admin"]').first();
    await expect(adminLink).toBeVisible();
=======
    await loginWithCode(page, adminCode, "/");
    await page.goto(`${base}/`);
    await page.getByRole("button", { name: /аккаунт/i }).click();
    await expect(page.getByRole("link", { name: /в админку/i })).toBeVisible();
>>>>>>> 737c5be (codex snapshot)
  });
});
