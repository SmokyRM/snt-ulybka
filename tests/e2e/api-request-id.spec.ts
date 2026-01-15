import { test, expect } from "@playwright/test";

test.describe("API Request-ID", () => {
  test("GET /api/healthz должен возвращать x-request-id в заголовках", async ({ request }) => {
    const response = await request.get("/api/healthz");
    
    expect(response.status()).toBe(200);
    
    const requestId = response.headers()["x-request-id"];
    expect(requestId).toBeTruthy();
    expect(typeof requestId).toBe("string");
    expect(requestId.length).toBeGreaterThan(0);
  });

  test("GET /api/healthz должен возвращать x-request-id даже если заголовок не передан", async ({ request }) => {
    const response = await request.get("/api/healthz", {
      headers: {},
    });
    
    expect(response.status()).toBe(200);
    
    const requestId = response.headers()["x-request-id"];
    expect(requestId).toBeTruthy();
  });

  test("GET /api/healthz должен использовать переданный x-request-id если он есть", async ({ request }) => {
    const customRequestId = "custom-request-id-123";
    const response = await request.get("/api/healthz", {
      headers: {
        "x-request-id": customRequestId,
      },
    });
    
    expect(response.status()).toBe(200);
    
    const requestId = response.headers()["x-request-id"];
    expect(requestId).toBe(customRequestId);
  });

  test("GET /api/healthz должен возвращать валидный JSON с ok: true", async ({ request }) => {
    const response = await request.get("/api/healthz");
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("time");
  });
});
