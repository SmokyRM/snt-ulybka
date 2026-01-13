import type { Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const TEST_ACCESS_CODE = process.env.TEST_ACCESS_CODE || "1111";

export async function loginResidentByCode(page: Page, next: string = "/cabinet") {
  await page.goto(`${baseURL}/login?next=${encodeURIComponent(next)}`);
  await page.getByTestId("login-access-code").fill(TEST_ACCESS_CODE);
  const urlPattern = new RegExp(next.replace("/", "\\/") + "(\\/|$)", "i");
  await Promise.all([
    page.waitForURL(urlPattern, { timeout: 15000 }),
    page.getByTestId("login-submit").click(),
  ]);
}

type StaffRole = "chairman" | "secretary" | "accountant";

type StaffCreds = {
  username: string;
  password: string;
};

function getStaffCreds(role: StaffRole): StaffCreds {
  const usernameEnv = `AUTH_USER_${role.toUpperCase()}` as const;
  const passwordEnv = `AUTH_PASS_${role.toUpperCase()}` as const;
  const username = process.env[usernameEnv] || role;
  const password = process.env[passwordEnv] || "";
  return { username, password };
}

export async function loginStaff(page: Page, role: StaffRole, next: string = "/office") {
  const creds = getStaffCreds(role);
  await page.goto(`${baseURL}/staff-login?next=${encodeURIComponent(next)}`);
  await page.getByTestId("staff-login-username").fill(creds.username);
  await page.getByTestId("staff-login-password").fill(creds.password);
  const urlPattern = next === "/office" ? /\/office(\/|$)/ : new RegExp(next.replace("/", "\\/") + "(\\/|$)", "i");
  await Promise.all([
    page.waitForURL(urlPattern, { timeout: 15000 }),
    page.getByTestId("staff-login-submit").click(),
  ]);
}
