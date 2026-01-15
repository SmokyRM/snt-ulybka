import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const adminCode = process.env.TEST_ADMIN_CODE || "1233";
const chairmanCode = process.env.TEST_CHAIRMAN_CODE || "2222";
const secretaryCode = process.env.TEST_SECRETARY_CODE || "3333";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";

/**
 * E2E тесты для проверки приоритета ролей из cookie над QA override в middleware
 * 
 * Сценарий: cookie role="admin"/"chairman"/etc, qaCookie="resident"
 * Ожидание: effectiveRole остается staff ролью, /admin или /office разрешены
 */
test.describe("Middleware role priority: staff roles from cookie override QA resident", () => {
  test.beforeEach(async ({ page, context }) => {
    // Очищаем все cookies перед каждым тестом
    await context.clearCookies();
  });

  test("admin роль из cookie НЕ перезаписывается QA resident, /admin доступен", async ({
    page,
    context,
  }) => {
    // 1. Логинимся как admin через staff-login
    await page.goto(`${base}/staff/login?next=/admin`);
    await page.getByLabel(/роль/i).fill("admin");
    await page.getByLabel(/пароль/i).fill(adminCode);
    await page.getByRole("button", { name: /войти/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 5000 });

    // 2. Проверяем, что cookie содержит role=admin
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "snt_session");
    expect(sessionCookie).toBeTruthy();
    const sessionData = JSON.parse(sessionCookie!.value);
    expect(sessionData.role).toBe("admin");

    // 3. Устанавливаем QA cookie = "resident"
    await context.addCookies([
      {
        name: "qaScenario",
        value: "resident",
        domain: new URL(base).hostname,
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // 4. Проверяем, что /admin всё ещё доступен (не редиректит на /forbidden)
    await page.goto(`${base}/admin`);
    await expect(page).toHaveURL(/\/admin/, { timeout: 5000 });
    // Должен быть виден админский контент, а не страница forbidden
    await expect(page.locator("body")).not.toContainText(/доступ запрещен/i);

    // 5. Проверяем /api/whoami (если доступен в dev)
    const whoamiResponse = await page.request.get(`${base}/api/whoami`);
    if (whoamiResponse.ok()) {
      const whoami = await whoamiResponse.json();
      // effectiveRole должен быть "admin", а не "resident"
      expect(whoami.analysis?.isAdmin).toBe(true);
      expect(whoami.normalized?.effectiveRole).toBe("admin");
    }
  });

  test("chairman роль из cookie НЕ перезаписывается QA resident, /office доступен", async ({
    page,
    context,
  }) => {
    // 1. Логинимся как chairman через staff-login
    await page.goto(`${base}/staff/login?next=/office`);
    await page.getByLabel(/роль/i).fill("chairman");
    await page.getByLabel(/пароль/i).fill(chairmanCode);
    await page.getByRole("button", { name: /войти/i }).click();
    await page.waitForURL(/\/office/, { timeout: 5000 });

    // 2. Проверяем, что cookie содержит role=chairman
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "snt_session");
    expect(sessionCookie).toBeTruthy();
    const sessionData = JSON.parse(sessionCookie!.value);
    expect(sessionData.role).toBe("chairman");

    // 3. Устанавливаем QA cookie = "resident"
    await context.addCookies([
      {
        name: "qaScenario",
        value: "resident",
        domain: new URL(base).hostname,
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // 4. Проверяем, что /office всё ещё доступен
    await page.goto(`${base}/office`);
    await expect(page).toHaveURL(/\/office/, { timeout: 5000 });
    await expect(page.locator("body")).not.toContainText(/доступ запрещен/i);
  });

  test("secretary роль из cookie НЕ перезаписывается QA resident, /office доступен", async ({
    page,
    context,
  }) => {
    // 1. Логинимся как secretary через staff-login
    await page.goto(`${base}/staff/login?next=/office`);
    await page.getByLabel(/роль/i).fill("secretary");
    await page.getByLabel(/пароль/i).fill(secretaryCode);
    await page.getByRole("button", { name: /войти/i }).click();
    await page.waitForURL(/\/office/, { timeout: 5000 });

    // 2. Устанавливаем QA cookie = "resident"
    await context.addCookies([
      {
        name: "qaScenario",
        value: "resident",
        domain: new URL(base).hostname,
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // 3. Проверяем, что /office всё ещё доступен
    await page.goto(`${base}/office`);
    await expect(page).toHaveURL(/\/office/, { timeout: 5000 });
    await expect(page.locator("body")).not.toContainText(/доступ запрещен/i);
  });

  test("accountant роль из cookie НЕ перезаписывается QA resident, /office доступен", async ({
    page,
    context,
  }) => {
    // 1. Логинимся как accountant через staff-login
    await page.goto(`${base}/staff/login?next=/office`);
    await page.getByLabel(/роль/i).fill("accountant");
    await page.getByLabel(/пароль/i).fill(accountantCode);
    await page.getByRole("button", { name: /войти/i }).click();
    await page.waitForURL(/\/office/, { timeout: 5000 });

    // 2. Устанавливаем QA cookie = "resident"
    await context.addCookies([
      {
        name: "qaScenario",
        value: "resident",
        domain: new URL(base).hostname,
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // 3. Проверяем, что /office всё ещё доступен
    await page.goto(`${base}/office`);
    await expect(page).toHaveURL(/\/office/, { timeout: 5000 });
    await expect(page.locator("body")).not.toContainText(/доступ запрещен/i);
  });

  test("admin роль из cookie НЕ перезаписывается QA resident_ok, /admin доступен", async ({
    page,
    context,
  }) => {
    // 1. Логинимся как admin
    await page.goto(`${base}/staff/login?next=/admin`);
    await page.getByLabel(/роль/i).fill("admin");
    await page.getByLabel(/пароль/i).fill(adminCode);
    await page.getByRole("button", { name: /войти/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 5000 });

    // 2. Устанавливаем QA cookie = "resident_ok"
    await context.addCookies([
      {
        name: "qaScenario",
        value: "resident_ok",
        domain: new URL(base).hostname,
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // 3. Проверяем, что /admin всё ещё доступен
    await page.goto(`${base}/admin`);
    await expect(page).toHaveURL(/\/admin/, { timeout: 5000 });
    await expect(page.locator("body")).not.toContainText(/доступ запрещен/i);
  });
});
