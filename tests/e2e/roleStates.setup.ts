import { test, expect, type Page } from "@playwright/test";
import { loginResidentByCode, loginStaff, getStaffCreds } from "./helpers/auth";
import * as fs from "fs";
import * as path from "path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const TEST_CODE = process.env.TEST_ACCESS_CODE || "1111";
const ADMIN_CODE = process.env.TEST_ADMIN_CODE || "1233";

const AUTH_DIR = path.join(__dirname, ".auth");
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function loginResident(page: Page) {
  await loginResidentByCode(page, "/cabinet");
  // Ensure we're on cabinet page
  const currentUrl = page.url();
  if (!currentUrl.includes("/cabinet")) {
    await page.goto(`${baseURL}/cabinet`);
    await page.waitForURL((url) => url.pathname.startsWith("/cabinet"), { timeout: 10000 });
  }
  await expect(page).not.toHaveURL(/\/login/);
}

async function loginAdmin(page: Page) {
  await page.goto(`${baseURL}/login?as=admin&next=/admin`);
  // Wait for form to be ready
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 5000 });
  // Fill code (should be pre-filled via ?as=admin)
  const codeInput = page.getByLabel(/код доступа/i);
  await codeInput.fill(ADMIN_CODE);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
  // Ensure we're on admin page
  const currentUrl = page.url();
  if (!currentUrl.includes("/admin")) {
    await page.goto(`${baseURL}/admin`);
    await page.waitForURL((url) => url.pathname.startsWith("/admin"), { timeout: 10000 });
  }
  await expect(page).not.toHaveURL(/\/login/);
}

async function loginStaffRole(page: Page, role: "chairman" | "secretary" | "accountant") {
  const creds = getStaffCreds(role);
  if (creds) {
    // Use real credentials
    await page.goto(`${baseURL}/staff-login?as=${role}&next=/office`);
    await page.waitForSelector('[data-testid="staff-login-form"]', { timeout: 5000 });
    await page.getByTestId("staff-login-username").fill(creds.username);
    await page.getByTestId("staff-login-password").fill(creds.password);
    await page.getByTestId("staff-login-submit").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/staff-login"), { timeout: 15000 });
  } else {
    // Fallback to QA override
    await page.context().clearCookies();
    await page.goto(`${baseURL}/office?qa=${role}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => {
      const path = url.pathname;
      return path.startsWith("/office") || path.startsWith("/forbidden");
    }, { timeout: 20000 });
  }
  // Ensure we're on office page (or at least not on login)
  const currentUrl = page.url();
  if (currentUrl.includes("/staff-login") || currentUrl.includes("/login")) {
    // Still on login page - try navigating to office
    await page.goto(`${baseURL}/office`);
    await page.waitForURL((url) => {
      const path = url.pathname;
      return path.startsWith("/office") || path.startsWith("/forbidden");
    }, { timeout: 10000 });
  }
  // Verify we're not on login page
  await expect(page).not.toHaveURL(/\/staff-login/);
  await expect(page).not.toHaveURL(/\/login/);
}

test("generate resident storageState", async ({ page }: { page: Page }) => {
  await loginResident(page);
  await page.context().storageState({ path: path.join(AUTH_DIR, "resident.json") });
});

test("generate admin storageState", async ({ page }: { page: Page }) => {
  await loginAdmin(page);
  await page.context().storageState({ path: path.join(AUTH_DIR, "admin.json") });
});

test("generate chairman storageState", async ({ page }: { page: Page }) => {
  await loginStaffRole(page, "chairman");
  await page.context().storageState({ path: path.join(AUTH_DIR, "chairman.json") });
});

test("generate secretary storageState", async ({ page }: { page: Page }) => {
  await loginStaffRole(page, "secretary");
  await page.context().storageState({ path: path.join(AUTH_DIR, "secretary.json") });
});

test("generate accountant storageState", async ({ page }: { page: Page }) => {
  await loginStaffRole(page, "accountant");
  await page.context().storageState({ path: path.join(AUTH_DIR, "accountant.json") });
});
