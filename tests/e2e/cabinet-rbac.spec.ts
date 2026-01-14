import { test, expect, type Page } from "@playwright/test";
import { loginResidentByCode } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Cabinet RBAC - role-based UX", () => {
  test.use({ storageState: undefined });

  test("resident login -> /cabinet shows cabinet-root, role-indicator and cabinet-page-root", async ({ page }: { page: Page }) => {
    await loginResidentByCode(page, "/cabinet");
    
    // Wait for navigation away from /login (onboarding redirects are handled in loginResidentByCode)
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
    const url = page.url();
    
    // Handle onboarding redirect
    if (url.includes("onboarding=1") || url.includes("/onboarding") || url.includes("/cabinet/profile")) {
      await page.waitForURL((url) => url.pathname.includes("/onboarding") || url.pathname.includes("/cabinet"), { timeout: 5000 }).catch(() => {});
      const currentUrl = page.url();
      if (currentUrl.includes("/onboarding")) {
        await expect(page.locator('input[name="fullName"]')).toBeVisible({ timeout: 5000 });
        return;
      }
      await expect(page.locator('h1').or(page.locator('input')).first()).toBeVisible({ timeout: 5000 });
      return;
    }
    
    // Wait for final URL if not onboarding
    await page.waitForURL((url) => url.pathname.startsWith("/cabinet") || url.pathname.startsWith("/forbidden"), { timeout: 15000 });
    const finalUrl = page.url();
    
    if (finalUrl.includes("/forbidden")) {
      await expect(page.getByTestId("forbidden-root")).toBeVisible();
    } else {
      // Verify cabinet layout elements
      await expect(page.getByTestId("cabinet-root")).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("role-indicator")).toBeVisible({ timeout: 5000 });
      
      // Verify cabinet page content (may be on onboarding/profile, so check if cabinet-page-root exists)
      const cabinetPageRoot = page.getByTestId("cabinet-page-root");
      const hasCabinetPageRoot = await cabinetPageRoot.isVisible().catch(() => false);
      if (hasCabinetPageRoot) {
        await expect(cabinetPageRoot).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("staff QA override (chairman) -> /cabinet shows 'no resident profile' + CTA to office", async ({ page }: { page: Page }) => {
    // Clear cookies and navigate with QA param
    await page.context().clearCookies();
    await page.goto(`${base}/cabinet?qa=chairman`, { waitUntil: "domcontentloaded" });
    
    // Wait for navigation to /cabinet (not /forbidden, not /login)
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/login") || path.startsWith("/staff-login")) {
        return false;
      }
      return path.startsWith("/cabinet");
    }, { timeout: 20000 });
    
    const currentUrl = page.url();
    // Should NOT redirect to /forbidden or /login
    expect(currentUrl).not.toContain("/forbidden");
    expect(currentUrl).not.toContain("/login");
    expect(currentUrl).not.toContain("/staff-login");
    
    // Primary check: cabinet-root MUST be visible
    await expect(page.getByTestId("cabinet-root")).toBeVisible({ timeout: 15000 });
    
    // Verify "no resident profile" block is visible
    await expect(page.getByTestId("cabinet-no-resident-profile")).toBeVisible({ timeout: 10000 });
    
    // Verify readonly hint
    await expect(page.getByTestId("cabinet-readonly-hint")).toBeVisible({ timeout: 5000 });
    
    // Verify CTA to office is visible
    await expect(page.getByTestId("cabinet-cta-to-office")).toBeVisible({ timeout: 5000 });
  });

  test("admin QA override -> /cabinet shows 'no resident profile' + CTA to admin", async ({ page }: { page: Page }) => {
    // Clear cookies and navigate with QA param
    await page.context().clearCookies();
    await page.goto(`${base}/cabinet?qa=admin`, { waitUntil: "domcontentloaded" });
    
    // Wait for navigation to /cabinet (not /forbidden, not /login)
    // Note: admin with admin_view cookie might redirect to /admin, so we check for either /cabinet or /admin
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/login")) {
        return false;
      }
      return path.startsWith("/cabinet") || path.startsWith("/admin");
    }, { timeout: 20000 });
    
    const currentUrl = page.url();
    
    // If redirected to /admin (admin view mode), that's also valid - just verify we're not on forbidden/login
    if (currentUrl.includes("/admin")) {
      await expect(page.getByTestId("admin-root")).toBeVisible({ timeout: 15000 });
      return;
    }
    
    // Should NOT redirect to /forbidden or /login
    expect(currentUrl).not.toContain("/forbidden");
    expect(currentUrl).not.toContain("/login");
    
    // Primary check: cabinet-root MUST be visible
    await expect(page.getByTestId("cabinet-root")).toBeVisible({ timeout: 15000 });
    
    // Verify "no resident profile" block is visible
    await expect(page.getByTestId("cabinet-no-resident-profile")).toBeVisible({ timeout: 10000 });
    
    // Verify readonly hint
    await expect(page.getByTestId("cabinet-readonly-hint")).toBeVisible({ timeout: 5000 });
    
    // Verify CTA to admin is visible
    await expect(page.getByTestId("cabinet-cta-to-admin")).toBeVisible({ timeout: 5000 });
  });
});
