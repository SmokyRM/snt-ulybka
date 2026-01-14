import { test, expect, type Page } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office RBAC - role-based access", () => {
  test.use({ storageState: undefined });

  test("secretary: /office accessible, /office/finance => forbidden", async ({ page }: { page: Page }) => {
    // Clear cookies and navigate with QA param
    await page.context().clearCookies();
    await page.goto(`${base}/office?qa=secretary`, { waitUntil: "domcontentloaded" });
    
    // Wait for navigation to /office (not /staff-login)
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/staff-login")) {
        return false;
      }
      return path.startsWith("/office") || path.startsWith("/forbidden");
    }, { timeout: 20000 });
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/staff-login");
    
    // Primary check: office-root MUST be visible
    await expect(page.getByTestId("office-root")).toBeVisible({ timeout: 15000 });
    
    // Try to access finance page
    await page.goto(`${base}/office/finance?qa=secretary`, { waitUntil: "domcontentloaded" });
    
    // Should redirect to forbidden
    await page.waitForURL((url) => {
      return url.pathname === "/forbidden" || url.pathname.startsWith("/forbidden");
    }, { timeout: 15000 });
    
    await expect(page.getByTestId("forbidden-root")).toBeVisible({ timeout: 10000 });
    const url = page.url();
    expect(url).toContain("reason=");
    expect(url).toContain("next=/office/finance");
  });

  test("accountant: /office accessible, /office/announcements => forbidden", async ({ page }: { page: Page }) => {
    // Clear cookies and navigate with QA param
    await page.context().clearCookies();
    await page.goto(`${base}/office?qa=accountant`, { waitUntil: "domcontentloaded" });
    
    // Wait for navigation to /office (not /staff-login)
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/staff-login")) {
        return false;
      }
      return path.startsWith("/office") || path.startsWith("/forbidden");
    }, { timeout: 20000 });
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/staff-login");
    
    // Primary check: office-root MUST be visible
    await expect(page.getByTestId("office-root")).toBeVisible({ timeout: 15000 });
    
    // Try to access announcements page
    await page.goto(`${base}/office/announcements?qa=accountant`, { waitUntil: "domcontentloaded" });
    
    // Should redirect to forbidden
    await page.waitForURL((url) => {
      return url.pathname === "/forbidden" || url.pathname.startsWith("/forbidden");
    }, { timeout: 15000 });
    
    await expect(page.getByTestId("forbidden-root")).toBeVisible({ timeout: 10000 });
    const url = page.url();
    expect(url).toContain("reason=");
    expect(url).toContain("next=/office/announcements");
  });

  test("chairman: /office/finance and /office/announcements accessible", async ({ page }: { page: Page }) => {
    // Clear cookies and navigate with QA param
    await page.context().clearCookies();
    await page.goto(`${base}/office/finance?qa=chairman`, { waitUntil: "domcontentloaded" });
    
    // Wait for navigation to /office/finance (not /forbidden)
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login")) {
        return false;
      }
      return path.startsWith("/office");
    }, { timeout: 20000 });
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/forbidden");
    expect(currentUrl).not.toContain("/staff-login");
    
    // Check finance page is accessible
    await expect(page.getByTestId("office-finance-root")).toBeVisible({ timeout: 15000 });
    
    // Try announcements page
    await page.goto(`${base}/office/announcements?qa=chairman`, { waitUntil: "domcontentloaded" });
    
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login")) {
        return false;
      }
      return path.startsWith("/office");
    }, { timeout: 20000 });
    
    // Check announcements page is accessible
    await expect(page.getByTestId("office-announcements-root")).toBeVisible({ timeout: 15000 });
  });
});
