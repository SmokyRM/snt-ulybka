import { test, expect, type Page } from "@playwright/test";
import { loginResidentByCode, loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const adminCode = process.env.TEST_ADMIN_CODE || "1233";

test.describe("RBAC - Role-based access control", () => {
  test.use({ storageState: undefined });

  test("admin can access /admin, others -> /forbidden", async ({ page }: { page: Page }) => {
    // Admin can access /admin
    await page.goto(`${base}/login?next=/admin`);
    await page.getByTestId("login-access-code").fill(adminCode);
    await page.getByTestId("login-submit").click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await expect(page.getByTestId("admin-root")).toBeVisible();

    // Resident cannot access /admin
    await loginResidentByCode(page, "/admin");
    await page.waitForURL(/\/forbidden/, { timeout: 15000 });
    await expect(page.getByTestId("forbidden-root")).toBeVisible();
    await expect(page.getByTestId("forbidden-root")).toContainText("администраторам");
  });

  test("staff can access /office, resident -> /forbidden", async ({ page }: { page: Page }) => {
    // Staff (chairman) can access /office
    const ok = await loginStaff(page, "chairman", "/office");
    test.skip(!ok, "No chairman creds in local env");
    await expect(page.getByTestId("office-dashboard-root")).toBeVisible();

    // Resident cannot access /office
    await loginResidentByCode(page, "/office");
    await page.waitForURL(/\/forbidden/, { timeout: 15000 });
    await expect(page.getByTestId("forbidden-root")).toBeVisible();
    await expect(page.getByTestId("forbidden-root")).toContainText("сотрудникам офиса");
  });

  test("resident can access /cabinet, staff -> /forbidden", async ({ page }: { page: Page }) => {
    // Resident can access /cabinet
    await loginResidentByCode(page, "/cabinet");
    await expect(page.getByTestId("cabinet-root")).toBeVisible();

    // Staff (chairman) cannot access /cabinet
    const ok = await loginStaff(page, "chairman", "/cabinet");
    test.skip(!ok, "No chairman creds in local env");
    await page.waitForURL(/\/forbidden/, { timeout: 15000 });
    await expect(page.getByTestId("forbidden-root")).toBeVisible();
    await expect(page.getByTestId("forbidden-root")).toContainText("жителям");
  });

  test("secretary can access /office", async ({ page }: { page: Page }) => {
    const ok = await loginStaff(page, "secretary", "/office");
    test.skip(!ok, "No secretary creds in local env");
    await expect(page.getByTestId("office-dashboard-root")).toBeVisible();
  });

  test("accountant can access /office", async ({ page }: { page: Page }) => {
    const ok = await loginStaff(page, "accountant", "/office");
    test.skip(!ok, "No accountant creds in local env");
    await expect(page.getByTestId("office-dashboard-root")).toBeVisible();
  });

  test("forbidden page shows correct reason for admin.resident", async ({ page }: { page: Page }) => {
    await loginResidentByCode(page, "/admin");
    await page.waitForURL(/\/forbidden/, { timeout: 15000 });
    await expect(page.getByTestId("forbidden-root")).toBeVisible();
    await expect(page.getByTestId("forbidden-root")).toContainText("администраторам");
    await expect(page.getByTestId("forbidden-root")).toContainText("Жители не могут");
  });

  test("forbidden page shows correct reason for office.resident", async ({ page }: { page: Page }) => {
    await loginResidentByCode(page, "/office");
    await page.waitForURL(/\/forbidden/, { timeout: 15000 });
    await expect(page.getByTestId("forbidden-root")).toBeVisible();
    await expect(page.getByTestId("forbidden-root")).toContainText("сотрудникам офиса");
    await expect(page.getByTestId("forbidden-root")).toContainText("Жители не могут");
  });

  test("forbidden page shows correct reason for cabinet.staff", async ({ page }: { page: Page }) => {
    const ok = await loginStaff(page, "chairman", "/cabinet");
    test.skip(!ok, "No chairman creds in local env");
    await page.waitForURL(/\/forbidden/, { timeout: 15000 });
    await expect(page.getByTestId("forbidden-root")).toBeVisible();
    await expect(page.getByTestId("forbidden-root")).toContainText("жителям");
    await expect(page.getByTestId("forbidden-root")).toContainText("Сотрудники офиса не могут");
  });
});
