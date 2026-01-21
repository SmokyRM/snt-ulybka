import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

type StaffRole = "admin" | "chairman" | "secretary" | "accountant";

interface StaffCredentials {
  login: string;
  password: string;
}

const ROLE_LOGINS: Record<StaffRole, string> = {
  admin: "админ",
  chairman: "председатель",
  secretary: "секретарь",
  accountant: "бухгалтер",
};

function getStaffCredentials(role: StaffRole): StaffCredentials | null {
  const passwordEnv = `AUTH_PASS_${role.toUpperCase()}` as const;
  const password = process.env[passwordEnv];
  
  if (!password) {
    return null;
  }
  
  return {
    login: ROLE_LOGINS[role],
    password,
  };
}

function getExpectedPath(role: StaffRole): string {
  return role === "admin" ? "/admin" : "/office";
}

function getExpectedTestId(role: StaffRole): string {
  return role === "admin" ? "admin-shell" : "office-root";
}

test.describe("Staff login for all roles", () => {
  test.use({ storageState: undefined });

  const roles: StaffRole[] = ["admin", "chairman", "secretary", "accountant"];

  for (const role of roles) {
    test(`${role} login redirects to correct page without refresh`, async ({ page }) => {
      const creds = getStaffCredentials(role);
      
      if (!creds) {
        test.skip(
          true,
          `Missing credentials for ${role}. Set AUTH_PASS_${role.toUpperCase()} environment variable.`
        );
        return;
      }

      const expectedPath = getExpectedPath(role);
      const expectedTestId = getExpectedTestId(role);

      // Clear cookies and storage to ensure clean state
      await page.context().clearCookies();
      await page.evaluate(() => {
        try {
          // @ts-expect-error - localStorage exists in browser context
          localStorage.clear();
          // @ts-expect-error - sessionStorage exists in browser context
          sessionStorage.clear();
        } catch {
          // Ignore if storage is not available
        }
      });

      // Navigate to staff-login page
      await page.goto(`${base}/staff-login`, { waitUntil: "domcontentloaded" });

      // Verify we're on the login page
      await expect(page.getByTestId("staff-login-root")).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId("staff-login-form")).toBeVisible();

      // Fill login form
      await page.getByTestId("staff-login-username").fill(creds.login);
      await page.getByTestId("staff-login-password").fill(creds.password);

      // Submit form and wait for navigation away from /staff-login
      await Promise.all([
        page.waitForURL(
          (url) => !url.pathname.startsWith("/staff-login") && !url.pathname.startsWith("/staff/login"),
          {
            timeout: 20000,
          }
        ),
        page.getByTestId("staff-login-submit").click(),
      ]);

      // Verify we're not still on login page with an error
      const currentUrl = page.url();
      const currentPath = new URL(currentUrl).pathname;

      // Should not be on login page
      expect(currentPath).not.toMatch(/\/staff-login|\/staff\/login/);

      // Should not show error
      const errorVisible = await page.getByTestId("staff-login-error").isVisible().catch(() => false);
      expect(errorVisible).toBe(false);

      // Verify we're on the expected path
      expect(currentPath).toMatch(new RegExp(`^${expectedPath}`));

      // Verify the expected test ID is visible (confirms we're on the right page)
      await expect(page.getByTestId(expectedTestId)).toBeVisible({ timeout: 10000 });

      // Additional verification for office roles
      if (role !== "admin") {
        await expect(page.getByTestId("office-nav")).toBeVisible({ timeout: 5000 });
      }

      // Verify we're authenticated by checking we can access the page
      // (no redirect back to login)
      await page.waitForTimeout(1000); // Small delay to ensure no redirect happens
      const finalUrl = page.url();
      const finalPath = new URL(finalUrl).pathname;
      expect(finalPath).toMatch(new RegExp(`^${expectedPath}`));
    });
  }
});
