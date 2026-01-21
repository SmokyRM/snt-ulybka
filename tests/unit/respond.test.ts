import { describe, it, expect, vi, beforeEach } from "vitest";
import { ok, badRequest, unauthorized, forbidden, methodNotAllowed, serverError, maskSecrets } from "@/lib/api/respond";

// Мокаем console.error для тестов
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

describe("respond", () => {
  describe("ok()", () => {
    it("возвращает JSON ответ со статусом 200", async () => {
      const request = new Request("https://example.com/api/test");
      const response = ok(request, { data: "test" });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({ ok: true, data: { data: "test" } });
    });

    it("добавляет x-request-id в заголовки", async () => {
      const request = new Request("https://example.com/api/test");
      const response = ok(request, { data: "test" });
      
      const requestId = response.headers.get("x-request-id");
      expect(requestId).toBeTruthy();
      expect(typeof requestId).toBe("string");
    });

    it("сохраняет переданный request-id если он есть", async () => {
      const customRequestId = "custom-request-id-123";
      const request = new Request("https://example.com/api/test", {
        headers: {
          "x-request-id": customRequestId,
        },
      });
      const response = ok(request, { data: "test" });
      
      const requestId = response.headers.get("x-request-id");
      expect(requestId).toBe(customRequestId);
    });

    it("позволяет указать кастомный статус", async () => {
      const request = new Request("https://example.com/api/test");
      const response = ok(request, { data: "test" }, { status: 201 });
      
      expect(response.status).toBe(201);
    });
  });

  describe("badRequest()", () => {
    it("возвращает JSON ответ со статусом 400", async () => {
      const request = new Request("https://example.com/api/test");
      const response = badRequest(request, "Ошибка валидации");

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("bad_request");
      expect(json.error.message).toBe("Ошибка валидации");
    });

    it("добавляет x-request-id в заголовки", async () => {
      const request = new Request("https://example.com/api/test");
      const response = badRequest(request, "Ошибка");
      
      const requestId = response.headers.get("x-request-id");
      expect(requestId).toBeTruthy();
    });

    it("может включать details", async () => {
      const request = new Request("https://example.com/api/test");
      const response = badRequest(request, "Ошибка", { field: "email" });

      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.details).toEqual({ field: "email" });
    });
  });

  describe("unauthorized()", () => {
    it("возвращает JSON ответ со статусом 401", async () => {
      const request = new Request("https://example.com/api/test");
      const response = unauthorized(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("unauthorized");
      expect(json.error.message).toBe("Требуется авторизация");
    });

    it("может принимать кастомное сообщение", async () => {
      const request = new Request("https://example.com/api/test");
      const response = unauthorized(request, "Неверные учётные данные");

      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.message).toBe("Неверные учётные данные");
    });
  });

  describe("forbidden()", () => {
    it("возвращает JSON ответ со статусом 403", async () => {
      const request = new Request("https://example.com/api/test");
      const response = forbidden(request);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("forbidden");
      expect(json.error.message).toBe("Доступ запрещён");
    });
  });

  describe("methodNotAllowed()", () => {
    it("возвращает JSON ответ со статусом 405", async () => {
      const request = new Request("https://example.com/api/test");
      const response = methodNotAllowed(request, ["GET", "POST"]);

      expect(response.status).toBe(405);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("method_not_allowed");
    });

    it("добавляет Allow header с разрешёнными методами", async () => {
      const request = new Request("https://example.com/api/test");
      const response = methodNotAllowed(request, ["GET", "POST"]);
      
      const allowHeader = response.headers.get("Allow");
      expect(allowHeader).toBe("GET, POST");
    });

    it("добавляет x-request-id в заголовки", async () => {
      const request = new Request("https://example.com/api/test");
      const response = methodNotAllowed(request, ["GET"]);
      
      const requestId = response.headers.get("x-request-id");
      expect(requestId).toBeTruthy();
    });
  });

  describe("serverError()", () => {
    it("возвращает JSON ответ со статусом 500", async () => {
      const request = new Request("https://example.com/api/test");
      const response = serverError(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("internal_error");
    });

    it("не содержит stacktrace в ответе", async () => {
      const request = new Request("https://example.com/api/test");
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test.js:1:1";
      const response = serverError(request, "Ошибка", error);

      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).not.toHaveProperty("stack");
      expect(JSON.stringify(json)).not.toContain("at test.js");
    });

    it("логирует ошибку в console.error", async () => {
      const request = new Request("https://example.com/api/test");
      const error = new Error("Test error");
      serverError(request, "Ошибка", error);
      
      expect(console.error).toHaveBeenCalled();
      const callArgs = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs).toContain("[api-server-error]");
    });

    it("маскирует секреты в логах", async () => {
      const request = new Request("https://example.com/api/test");
      const error = new Error("Test error");
      const errorWithSecrets = {
        ...error,
        password: "secret123",
        apiKey: "key456",
      };
      serverError(request, "Ошибка", errorWithSecrets);
      
      expect(console.error).toHaveBeenCalled();
      const callArgs = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const loggedData = callArgs[1];
      expect(loggedData).not.toHaveProperty("password", "secret123");
      expect(loggedData).not.toHaveProperty("apiKey", "key456");
    });

    it("включает request-id в ответ в dev режиме", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const request = new Request("https://example.com/api/test");
      const response = serverError(request);

      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.details).toHaveProperty("requestId");

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("maskSecrets()", () => {
    it("маскирует поля с секретами", () => {
      const obj = {
        username: "user",
        password: "secret123",
        apiKey: "key456",
        data: "normal",
      };
      
      const masked = maskSecrets(obj);
      expect(masked).toEqual({
        username: "user",
        password: "***MASKED***",
        apiKey: "***MASKED***",
        data: "normal",
      });
    });

    it("работает с вложенными объектами", () => {
      const obj = {
        user: {
          name: "John",
          password: "secret",
        },
        token: "abc123",
      };
      
      const masked = maskSecrets(obj);
      expect(masked).toEqual({
        user: {
          name: "John",
          password: "***MASKED***",
        },
        token: "***MASKED***",
      });
    });

    it("работает с массивами", () => {
      const obj = [
        { name: "user1", password: "secret1" },
        { name: "user2", password: "secret2" },
      ];
      
      const masked = maskSecrets(obj);
      expect(masked).toEqual([
        { name: "user1", password: "***MASKED***" },
        { name: "user2", password: "***MASKED***" },
      ]);
    });
  });
});
