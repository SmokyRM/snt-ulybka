import { expect, test, type Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Priority: TEST_ACCESS_CODE > AUTH_PASS_RESIDENT > USER_ACCESS_CODE
function getResidentCode(): string {
  return process.env.TEST_ACCESS_CODE ?? process.env.AUTH_PASS_RESIDENT ?? process.env.USER_ACCESS_CODE ?? "";
}

export async function fillAccessCodeAndSubmit(page: Page, code: string) {
  const codeInput =
    page.getByTestId("login-access-code").or(page.getByTestId("staff-login-access-code"));

  let inputElement = codeInput.first();
  let inputFound = await inputElement.isVisible().catch(() => false);

  if (!inputFound) {
    const labeledInput = page.getByLabel(/код/i);
    if (await labeledInput.first().isVisible().catch(() => false)) {
      inputElement = labeledInput.first();
      inputFound = true;
    }
  }

  if (!inputFound) {
    const fallbackInput = page.locator('input[name="code"], input[type="password"]');
    inputElement = fallbackInput.first();
    inputFound = await inputElement.isVisible().catch(() => false);
  }

  if (!inputFound) {
    throw new Error(`[fillAccessCodeAndSubmit] No code input found on page: ${page.url()}`);
  }

  await inputElement.fill(code);

  // Verify input has value after fill
  const inputValue = await inputElement.inputValue().catch(() => "");
  if (inputValue.length === 0) {
    throw new Error(`[fillAccessCodeAndSubmit] Input value is empty after fill at: ${page.url()}`);
  }

  const submitButton =
    page.getByTestId("login-submit").or(page.getByTestId("staff-login-submit"));

  if (await submitButton.first().isVisible().catch(() => false)) {
    const isDisabled = await submitButton.first().isDisabled().catch(() => false);
    if (isDisabled) {
      throw new Error(`[fillAccessCodeAndSubmit] Submit button is disabled at: ${page.url()}`);
    }
    await submitButton.first().click();
    return;
  }

  const fallbackButton = page.locator('button:has-text(/войти|login|продолжить/i)');
  const fallbackVisible = await fallbackButton.first().isVisible().catch(() => false);
  if (!fallbackVisible) {
    throw new Error(`[fillAccessCodeAndSubmit] No submit button found at: ${page.url()}`);
  }
  await fallbackButton.first().click();
}

export function skipIfMissingEnv(testRef: typeof test, envKeys: string[]) {
  const missing = envKeys.filter((key) => !process.env[key]);
  if (missing.length) {
    testRef.skip(true, `Missing ${missing.join(", ")}`);
  }
}

export async function loginResidentByCode(page: Page, next: string = "/cabinet") {
  const residentCode = getResidentCode();
  if (!residentCode) {
    throw new Error(
      "[loginResidentByCode] Missing resident code. Set one of: TEST_ACCESS_CODE, AUTH_PASS_RESIDENT, or USER_ACCESS_CODE"
    );
  }

  const codeSource = process.env.TEST_ACCESS_CODE ? "TEST_ACCESS_CODE" : process.env.AUTH_PASS_RESIDENT ? "AUTH_PASS_RESIDENT" : "USER_ACCESS_CODE";
  console.log(`[loginResidentByCode] Using code from: ${codeSource}`);

  await page.goto(`${baseURL}/login?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });

  // Verify we're actually on /login page before trying to fill form
  const initialUrl = page.url();
  if (!initialUrl.includes("/login")) {
    console.log(`[loginResidentByCode] Redirected from /login to: ${initialUrl}, retrying...`);
    await page.goto(`${baseURL}/login?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
  }

  // Double-check we're on login page
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

  // Set up response listener BEFORE clicking submit
  const authResponsePromise = page
    .waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        (res.url().includes("/api/auth/resident-login") || res.url().includes("/api/auth/login")),
      { timeout: 15000 }
    )
    .catch(() => null);

  await fillAccessCodeAndSubmit(page, residentCode);

  // Wait for auth API response and capture diagnostics
  const authResponse = await authResponsePromise;
  let apiDiagnostics = "";
  if (authResponse) {
    const status = authResponse.status();
    apiDiagnostics = `API status: ${status}`;
    try {
      const json = await authResponse.json();
      // Log full response for debugging (without secrets)
      const safeJson = { ...json };
      delete safeJson.code; // Don't log any codes
      console.log(`[loginResidentByCode] API response: ${JSON.stringify(safeJson)}`);

      if (json.error?.message) {
        apiDiagnostics += `, error: ${json.error.message}`;
      } else if (json.message) {
        apiDiagnostics += `, message: ${json.message}`;
      } else if (!json.ok && json.error) {
        apiDiagnostics += `, error: ${JSON.stringify(json.error)}`;
      } else if (json.role) {
        apiDiagnostics += `, role: ${json.role}`;
      }
    } catch {
      // Response might not be JSON
    }
    console.log(`[loginResidentByCode] ${apiDiagnostics}`);
  }

  // Wait for navigation or error content (not just container - it's always visible)
  // The actual error is inside login-error-block > div.bg-red-50
  const errorContentSelector = '[data-testid="login-error-block"] > div';

  const residentResult = await Promise.race([
    expect(page).toHaveURL(/\/(cabinet|onboarding)(\/|$)/, { timeout: 15000 }).then(() => "navigated"),
    page
      .locator(errorContentSelector)
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => "error")
      .catch(() => null),
  ]);

  if (residentResult === "error") {
    let errorText = await page
      .locator(errorContentSelector)
      .innerText()
      .catch(() => "");
    if (!errorText) {
      errorText = await page.getByTestId("login-error-block").innerText().catch(() => "");
    }
    const currentUrl = page.url();
    throw new Error(
      `[loginResidentByCode] Login failed at ${currentUrl}, error: "${errorText || "(empty)"}". ${apiDiagnostics}`
    );
  }

  // If we didn't navigate and didn't get error block, check if still on login
  const afterSubmitUrl = page.url();
  if (afterSubmitUrl.includes("/login") && residentResult !== "navigated") {
    throw new Error(
      `[loginResidentByCode] Still on login page after submit: ${afterSubmitUrl}. ${apiDiagnostics}`
    );
  }

  // Allow onboarding redirect (/cabinet/profile?onboarding=1 or /onboarding) as successful login
  const finalUrl = page.url();
  const pathname = new URL(finalUrl).pathname;
  const isOnboarding = pathname.includes("onboarding") || finalUrl.includes("onboarding=1") || pathname === "/onboarding";
  const isForbidden = pathname.startsWith("/forbidden");
  const isCabinet = pathname.startsWith("/cabinet");

  console.log(`[loginResidentByCode] Final URL: ${finalUrl}`);

  // If we're on onboarding/forbidden/cabinet, that's fine - test will handle it
  if (isOnboarding || isForbidden || isCabinet) {
    return; // Success - test will verify appropriate page
  }

  // Otherwise, navigate to next and let test handle forbidden/office/admin checks
  await page.goto(`${baseURL}${next}`, { waitUntil: "domcontentloaded" });
}

type StaffRole = "admin" | "chairman" | "secretary" | "accountant";

type StaffCreds = {
  password: string;
};

export function isCI(): boolean {
  return process.env.CI === "true";
}

export function getStaffCreds(role: StaffRole): StaffCreds | null {
  const passwordEnv = `AUTH_PASS_${role.toUpperCase()}` as const;
  const password = process.env[passwordEnv];
  if (!password) {
    return null;
  }
  return { password };
}

export function requireStaffCreds(role: StaffRole): StaffCreds | null {
  const creds = getStaffCreds(role);
  if (!creds) {
    const missing = [];
    if (!process.env[`AUTH_PASS_${role.toUpperCase()}`]) {
      missing.push(`AUTH_PASS_${role.toUpperCase()}`);
    }
    throw new Error(`Missing credentials for ${role}: ${missing.join(", ")}`);
  }
  return creds;
}

export async function loginStaff(page: Page, role: StaffRole, next: string = "/office"): Promise<boolean> {
  const creds = requireStaffCreds(role);
  if (!creds) {
    return false;
  }
  // Clear cookies and localStorage to ensure clean state
  await page.context().clearCookies();
  await page.goto(`${baseURL}/staff/login?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/staff\/login/, { timeout: 5000 });
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
  await page.getByTestId("staff-login-username").selectOption(role);
  await fillAccessCodeAndSubmit(page, creds.password);
  const staffResult = await Promise.race([
    expect(page).toHaveURL(/\/(admin|office)(\/|$)/, { timeout: 20000 }).then(() => "navigated"),
    page
      .getByTestId("staff-login-error")
      .waitFor({ state: "visible", timeout: 20000 })
      .then(() => "error")
      .catch(() => null),
  ]);
  if (staffResult === "error") {
    const errorText = await page.getByTestId("staff-login-error").innerText().catch(() => "(empty)");
    const currentUrl = page.url();
    throw new Error(`[loginStaff] Login failed at ${currentUrl}, error block: ${errorText || "(empty)"}`);
  }
  
  // Diagnostic: log final URL after login attempt
  const finalUrl = page.url();
  if (process.env.NODE_ENV !== "production") {
    console.log(`[loginStaff] After login attempt for ${role}, final URL: ${finalUrl}`);
  }
  
  const currentPath = new URL(finalUrl).pathname;

  // Verify expected root is visible
  if (currentPath.startsWith("/admin")) {
    await expect(page.getByTestId("admin-root")).toBeVisible({ timeout: 15000 });
  } else if (currentPath.startsWith("/office")) {
    await expect(page.getByTestId("office-root")).toBeVisible({ timeout: 15000 });
  }

  // Verify we're not still on staff-login with an error (which would mean login failed)
  if (currentPath.startsWith("/staff/login")) {
    // Check if there's an error - if so, login failed
    const errorVisible = await page.getByTestId("staff-login-error").isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await page
        .getByTestId("staff-login-error")
        .innerText()
        .catch(() => "(empty)");
      const currentUrl = page.url();
      if (process.env.NODE_ENV !== "production") {
        console.log(`[loginStaff] Login error at ${currentUrl}: ${errorText || "(empty)"}`);
      }
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
