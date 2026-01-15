import { test, expect } from "@playwright/test";

test.describe("QA Endpoints Security", () => {
  test.beforeEach(async ({ page }) => {
    // Логинимся как admin для доступа к QA endpoints
    await page.goto("/staff-login");
    await page.fill('input[data-testid="staff-login-username"]', "админ");
    await page.fill('input[data-testid="staff-login-password"]', process.env.AUTH_PASS_ADMIN || "admin");
    await page.click('button[data-testid="staff-login-submit"]');
    await page.waitForURL("/admin");
  });

  test("POST /api/admin/qa/seed без Origin должен вернуть 403", async ({ request }) => {
    const response = await request.post("/api/admin/qa/seed", {
      data: { create: [] },
      headers: {
        // Не передаем Origin header
      },
    });

    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toContain("безопасности");
    
    // Проверяем что request-id есть в ответе
    const requestId = response.headers()["x-request-id"];
    expect(requestId).toBeTruthy();
  });

  test("POST /api/admin/qa/seed с неправильным Origin должен вернуть 403", async ({ request }) => {
    const response = await request.post("/api/admin/qa/seed", {
      data: { create: [] },
      headers: {
        Origin: "https://evil.com",
      },
    });

    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toContain("безопасности");
    
    // Проверяем что request-id есть в ответе
    const requestId = response.headers()["x-request-id"];
    expect(requestId).toBeTruthy();
  });

  test("POST /api/admin/qa/seed с корректным Origin должен работать (в dev)", async ({ request, baseURL }) => {
    // Пропускаем тест если не dev или ENABLE_QA не установлен
    test.skip(
      process.env.NODE_ENV === "production" || process.env.ENABLE_QA !== "true",
      "QA endpoints работают только в dev с ENABLE_QA=true"
    );

    const response = await request.post("/api/admin/qa/seed", {
      data: { create: [] },
      headers: {
        Origin: baseURL || "http://localhost:3000",
        Referer: baseURL || "http://localhost:3000",
      },
    });

    // Может быть 200 или 404 (если не dev/ENABLE_QA)
    expect([200, 404]).toContain(response.status());
    
    // Проверяем что request-id есть в ответе
    const requestId = response.headers()["x-request-id"];
    expect(requestId).toBeTruthy();
  });

  test("POST /api/admin/qa/cleanup без Origin должен вернуть 403", async ({ request }) => {
    const response = await request.post("/api/admin/qa/cleanup", {
      headers: {
        // Не передаем Origin header
      },
    });

    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toContain("безопасности");
    
    // Проверяем что request-id есть в ответе
    const requestId = response.headers()["x-request-id"];
    expect(requestId).toBeTruthy();
  });

  test("POST /api/admin/qa/seed с неправильным методом должен вернуть 405", async ({ request }) => {
    const response = await request.get("/api/admin/qa/seed");

    expect(response.status()).toBe(405);
    const allowHeader = response.headers()["allow"];
    expect(allowHeader).toContain("POST");
    
    // Проверяем что request-id есть в ответе
    const requestId = response.headers()["x-request-id"];
    expect(requestId).toBeTruthy();
  });
});
