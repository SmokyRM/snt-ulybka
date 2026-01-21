import { test, expect } from "@playwright/test";
import { loginStaff } from "./helpers/auth";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const adminCode = process.env.TEST_ADMIN_CODE || "1233";

test.describe("Direct URL Access - Guard Rails", () => {
  test.use({ storageState: undefined });

  const criticalPages = [
    "/admin",
    "/admin/registry",
    "/admin/billing",
    "/admin/billing/debts",
    "/admin/billing/debtors",
    "/admin/billing/periods-unified",
    "/admin/billing/payments-import-new",
    "/admin/expenses",
    "/admin/targets",
    "/admin/electricity/report",
    "/admin/electricity/readings",
  ];

  test("critical pages handle direct URL access without auth", async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();

    for (const path of criticalPages) {
      await page.goto(`${baseURL}${path}`);
      
      // Should redirect to login or show forbidden, not crash
      const url = page.url();
      const isLogin = url.includes("/staff-login") || url.includes("/login");
      const isForbidden = url.includes("/forbidden");
      const isError = url.includes("/error") || url.includes("500");
      
      expect(isLogin || isForbidden || isError).toBeTruthy();
      
      // Page should load (not be blank/error)
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
      expect(bodyText?.length || 0).toBeGreaterThan(0);
    }
  });

  test("critical pages handle empty data gracefully", async ({ page }) => {
    // Login as admin
    await page.goto(`${baseURL}/staff-login?next=/admin`);
    await page.getByTestId("staff-login-username").fill("admin@snt.ru");
    await page.getByTestId("staff-login-password").fill(adminCode);
    await page.getByTestId("staff-login-submit").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/staff-login"), { timeout: 20000 });

    // Test pages that might have empty data
    const emptyDataPages = [
      "/admin/billing/debts",
      "/admin/billing/periods-unified",
      "/admin/expenses",
      "/admin/targets",
    ];

    for (const path of emptyDataPages) {
      await page.goto(`${baseURL}${path}`);
      await page.waitForTimeout(2000); // Wait for data loading

      // Page should render without errors
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
      
      // Should not have error messages (unless expected empty state)
      const errorMessages = await page.locator("text=/ошибка|error|500|crash/i").count();
      expect(errorMessages).toBe(0);
      
      // Should show either data or empty state
      const hasContent = bodyText && bodyText.length > 100;
      expect(hasContent).toBeTruthy();
    }
  });

  test("registry page handles empty data", async ({ page }) => {
    await page.goto(`${baseURL}/staff-login?next=/admin/registry`);
    await page.getByTestId("staff-login-username").fill("admin@snt.ru");
    await page.getByTestId("staff-login-password").fill(adminCode);
    await page.getByTestId("staff-login-submit").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/staff-login"), { timeout: 20000 });

    await page.goto(`${baseURL}/admin/registry`);
    await page.waitForTimeout(2000);

    // Should render without errors
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
    
    // Should show either data or empty state message
    const hasRegistryContent = bodyText?.includes("Реестр") || bodyText?.includes("пуст") || bodyText?.includes("Импорт");
    expect(hasRegistryContent).toBeTruthy();
  });
});
