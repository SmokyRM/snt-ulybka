import type { Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const TEST_ACCESS_CODE = process.env.TEST_ACCESS_CODE || "1111";

export async function loginResidentByCode(page: Page, next: string = "/cabinet") {
  await page.goto(`${baseURL}/login?next=${encodeURIComponent(next)}`);
  await page.getByTestId("login-access-code").fill(TEST_ACCESS_CODE);
  await page.getByTestId("login-submit").click();
  const urlPattern = new RegExp(next.replace("/", "\\/") + "(\\/|$)", "i");
  await page.waitForURL(urlPattern, { timeout: 15000 });
}

type StaffRole = "chairman" | "secretary" | "accountant";

type StaffCreds = {
  username: string;
  password: string;
};

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

export async function loginStaff(page: Page, role: StaffRole, next: string = "/office"): Promise<boolean> {
  const creds = getStaffCreds(role);
  if (!creds) {
    const isCI = process.env.CI === "true";
    if (isCI) {
      const missing = [];
      if (!process.env[`AUTH_USER_${role.toUpperCase()}`]) {
        missing.push(`AUTH_USER_${role.toUpperCase()}`);
      }
      if (!process.env[`AUTH_PASS_${role.toUpperCase()}`]) {
        missing.push(`AUTH_PASS_${role.toUpperCase()}`);
      }
      throw new Error(
        `Missing required environment variables for ${role} login in CI: ${missing.join(", ")}. Set these variables in CI environment.`,
      );
    }
    return false;
  }
  await page.goto(`${baseURL}/staff-login?next=${encodeURIComponent(next)}`);
  await page.getByTestId("staff-login-username").fill(creds.username);
  await page.getByTestId("staff-login-password").fill(creds.password);
  await page.getByTestId("staff-login-submit").click();
  const urlPattern = next === "/office" ? /\/office(\/|$)/ : new RegExp(next.replace("/", "\\/") + "(\\/|$)", "i");
  await page.waitForURL(urlPattern, { timeout: 15000 });
  return true;
}
