import { expect, type Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const TEST_ACCESS_CODE = process.env.TEST_ACCESS_CODE || "1111";

export async function loginResidentByCode(page: Page, next: string = "/cabinet") {
  await page.goto(`${baseURL}/login?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
  // Verify we're actually on /login page before trying to fill form
  const initialUrl = page.url();
  if (!initialUrl.includes("/login")) {
    // If redirected away, log and retry
    if (process.env.NODE_ENV !== "production") {
      console.log(`[loginResidentByCode] Redirected from /login to: ${initialUrl}, retrying...`);
    }
    await page.goto(`${baseURL}/login?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
  }
  // Double-check we're on login page
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  await page.getByTestId("login-access-code").fill(TEST_ACCESS_CODE);
  await page.getByTestId("login-submit").click();
  // Wait for navigation away from /login (allow onboarding/forbidden redirects)
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
  // Allow onboarding redirect (/cabinet/profile?onboarding=1 or /onboarding) as successful login
  const finalUrl = page.url();
  const pathname = new URL(finalUrl).pathname;
  const isOnboarding = pathname.includes("onboarding") || finalUrl.includes("onboarding=1") || pathname === "/onboarding";
  const isForbidden = pathname.startsWith("/forbidden");
  const isCabinet = pathname.startsWith("/cabinet");
  // If we're on onboarding/forbidden/cabinet, that's fine - test will handle it
  // Onboarding is considered successful login - user is authenticated
  if (isOnboarding || isForbidden || isCabinet) {
    return; // Success - test will verify appropriate page
  }
  // Otherwise, navigate to next and let test handle forbidden/office/admin checks
  await page.goto(`${baseURL}${next}`, { waitUntil: "domcontentloaded" });
}

type StaffRole = "chairman" | "secretary" | "accountant";

type StaffCreds = {
  username: string;
  password: string;
};

export function isCI(): boolean {
  return process.env.CI === "true";
}

export function getStaffCreds(role: StaffRole): StaffCreds | null {
  const usernameEnv = `AUTH_USER_${role.toUpperCase()}` as const;
  const passwordEnv = `AUTH_PASS_${role.toUpperCase()}` as const;
  const username = process.env[usernameEnv];
  const password = process.env[passwordEnv];
  if (!username || !password) {
    return null;
  }
  return { username, password };
}

export function requireStaffCreds(role: StaffRole): StaffCreds | null {
  const creds = getStaffCreds(role);
  if (!creds) {
    const missing = [];
    if (!process.env[`AUTH_USER_${role.toUpperCase()}`]) {
      missing.push(`AUTH_USER_${role.toUpperCase()}`);
    }
    if (!process.env[`AUTH_PASS_${role.toUpperCase()}`]) {
      missing.push(`AUTH_PASS_${role.toUpperCase()}`);
    }
    if (isCI()) {
      throw new Error(
        `Missing required environment variables for ${role} login in CI: ${missing.join(", ")}. Set these variables in CI environment.`,
      );
    }
    return null;
  }
  return creds;
}

export async function loginStaff(page: Page, role: StaffRole, next: string = "/office"): Promise<boolean> {
  const creds = requireStaffCreds(role);
  if (!creds) {
    // Guaranteed QA fallback for local dev when creds are missing
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[loginStaff] Missing credentials for ${role}, using QA override...`);
      }
      // Clear cookies and navigate to URL that sets QA cookie via middleware
      await page.context().clearCookies();
      // Navigate to office with qa param - middleware will set cookie
      await page.goto(`${baseURL}/office?qa=${role}`, { waitUntil: "domcontentloaded" });
      // Wait for navigation to /office (not /staff-login)
      await page.waitForURL((url) => {
        const path = url.pathname;
        // If redirected to /staff-login, QA override failed
        if (path.startsWith("/staff-login")) {
          return false;
        }
        return path.startsWith("/office") || path.startsWith("/forbidden");
      }, { timeout: 20000 });
      
      // Check if redirected to /staff-login (QA override failed)
      const currentUrl = page.url();
      if (currentUrl.includes("/staff-login")) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[loginStaff] QA override failed - redirected to /staff-login`);
        }
        return false;
      }
      
      // Primary success criterion: office-root MUST be visible (required)
      await expect(page.getByTestId("office-root")).toBeVisible({ timeout: 15000 });
      
      // Navigate to target next path if not already there
      if (next && !currentUrl.includes(next)) {
        await page.goto(`${baseURL}${next}`, { waitUntil: "domcontentloaded" });
        // Wait for navigation to /office or /forbidden (not /staff-login)
        await page.waitForURL((url) => {
          const path = url.pathname;
          if (path.startsWith("/staff-login")) {
            return false;
          }
          return path.startsWith("/office") || path.startsWith("/forbidden");
        }, { timeout: 20000 });
        const finalUrl = page.url();
        // If redirected back to /staff-login, QA override failed
        if (finalUrl.includes("/staff-login")) {
          if (process.env.NODE_ENV !== "production") {
            console.log(`[loginStaff] QA override failed after navigation - redirected to /staff-login`);
          }
          return false;
        }
      }
      
      if (process.env.NODE_ENV !== "production") {
        console.log(`[loginStaff] QA override successful for ${role}, final URL: ${page.url()}`);
      }
      return true;
    }
    // In CI, throw error if creds missing
    if (isCI()) {
      throw new Error(`Missing credentials for ${role} in CI. Set AUTH_USER_${role.toUpperCase()} and AUTH_PASS_${role.toUpperCase()}.`);
    }
    return false;
  }
  // Clear cookies and localStorage to ensure clean state
  await page.context().clearCookies();
  await page.goto(`${baseURL}/staff-login?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/staff-login/, { timeout: 5000 });
  // Clear localStorage in browser context
  await page.evaluate(() => {
    try {
      // @ts-expect-error - localStorage exists in browser context
      localStorage.clear();
    } catch {
      // Ignore if localStorage is not available
    }
  });
  // Wait for form to be ready
  await page.waitForSelector('[data-testid="staff-login-username"]', { timeout: 5000 });
  await page.getByTestId("staff-login-username").fill(creds.username);
  await page.getByTestId("staff-login-password").fill(creds.password);
  await page.getByTestId("staff-login-submit").click();
  // Wait for navigation away from /staff-login (allow /office, /forbidden, /cabinet redirects)
  await page.waitForURL((url) => !url.pathname.startsWith("/staff-login"), { timeout: 20000 });
  
  // Diagnostic: log final URL after login attempt
  const finalUrl = page.url();
  if (process.env.NODE_ENV !== "production") {
    console.log(`[loginStaff] After login attempt for ${role}, final URL: ${finalUrl}`);
  }
  
  // Verify we're not still on staff-login with an error (which would mean login failed)
  const currentPath = new URL(finalUrl).pathname;
  if (currentPath.startsWith("/staff-login")) {
    // Check if there's an error - if so, login failed
    const errorVisible = await page.getByTestId("staff-login-error").isVisible().catch(() => false);
    if (errorVisible) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[loginStaff] Login failed for ${role} - error visible`);
      }
      return false;
    }
  }
  
  // Check if we were redirected to /login instead of /office (bad redirect)
  if (currentPath.startsWith("/login") && !currentPath.startsWith("/login-staff")) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[loginStaff] WARNING: Redirected to /login instead of /office for ${role}`);
    }
    return false;
  }
  
  return true;
}
