import { test, expect } from "@playwright/test";

test.describe("API Fail-Closed", () => {
  test("POST /api/tickets с неправильным методом должен вернуть 405", async ({ request }) => {
    const response = await request.put("/api/tickets", {
      data: {},
    });
    
    expect(response.status()).toBe(405);
    const data = await response.json();
    expect(data).toHaveProperty("error", "method_not_allowed");
    expect(response.headers()["allow"]).toBeTruthy();
  });

  test("GET /api/tickets без авторизации должен вернуть 401", async ({ request }) => {
    const response = await request.get("/api/tickets");
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  test("POST /api/appeals с неправильным методом должен вернуть 405", async ({ request }) => {
    const response = await request.get("/api/appeals");
    
    expect(response.status()).toBe(405);
    const data = await response.json();
    expect(data).toHaveProperty("error", "method_not_allowed");
    expect(response.headers()["allow"]).toBeTruthy();
  });

  test("POST /api/appeals без авторизации должен вернуть 401", async ({ request }) => {
    const response = await request.post("/api/appeals", {
      data: {
        topic: "Общее",
        message: "Тестовое сообщение",
      },
    });
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});
