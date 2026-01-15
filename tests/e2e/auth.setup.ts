import { test, expect, type Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const TEST_CODE = process.env.TEST_ACCESS_CODE || "1111";

test("login and save state", async ({ page }: { page: Page }) => {
  await page.goto(`${baseURL}/login?next=/cabinet`);
  await page.getByTestId("login-access-code").fill(TEST_CODE);
  await page.getByTestId("login-submit").click();
  // Wait for navigation away from /login
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
  
  // Handle onboarding redirect if present
  const currentUrl = page.url();
  if (currentUrl.includes("onboarding") || currentUrl.includes("onboarding=1")) {
    // Wait for onboarding page to load
    await page.waitForURL((url) => url.pathname.includes("/onboarding") || url.pathname.includes("/cabinet"), { timeout: 10000 });
    // Verify onboarding form is visible
    await expect(page.locator('input[name="fullName"]')).toBeVisible({ timeout: 5000 });
    // Fill required fields
    await page.locator('input[name="fullName"]').fill("Test User");
    await page.locator('input[name="phone"]').fill("+79991234567");
    // Check consent checkbox
    await page.locator('input[type="checkbox"]').check();
    // Submit form
    await page.locator('button[type="submit"]').click();
    // Wait for redirect to cabinet after onboarding
    await page.waitForURL((url) => url.pathname.startsWith("/cabinet") && !url.pathname.includes("onboarding"), { timeout: 10000 });
  }
  
  // Ensure we're on cabinet page before saving state
  const finalPathname = new URL(page.url()).pathname;
  if (!finalPathname.startsWith("/cabinet")) {
    await page.goto(`${baseURL}/cabinet`);
    await page.waitForURL((url) => url.pathname.startsWith("/cabinet"), { timeout: 10000 });
  }
  
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: "playwright/.auth/state.json" });
});
