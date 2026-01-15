import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { rateLimit, clearAllRateLimits } from "@/lib/security/rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  // Включаем rate limiting для тестов
  const originalEnv = process.env.NODE_ENV;
  const originalQa = process.env.ENABLE_QA;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    process.env.ENABLE_QA = "true";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalQa === undefined) {
      delete process.env.ENABLE_QA;
    } else {
      process.env.ENABLE_QA = originalQa;
    }
    clearAllRateLimits();
  });

  describe("первые N ok, затем 429 логика", () => {
    it("разрешает первые N запросов в пределах лимита", () => {
      const key = "test-key-1";
      const limit = 3;
      const windowMs = 1000;

      // Первые 3 запроса должны быть ok
      expect(rateLimit(key, limit, windowMs).ok).toBe(true);
      expect(rateLimit(key, limit, windowMs).ok).toBe(true);
      expect(rateLimit(key, limit, windowMs).ok).toBe(true);
    });

    it("отклоняет запросы после превышения лимита", () => {
      const key = "test-key-2";
      const limit = 2;
      const windowMs = 1000;

      // Первые 2 запроса ok
      expect(rateLimit(key, limit, windowMs).ok).toBe(true);
      expect(rateLimit(key, limit, windowMs).ok).toBe(true);

      // Третий запрос должен быть отклонен
      const result = rateLimit(key, limit, windowMs);
      expect(result.ok).toBe(false);
      expect(result.retryAfterMs).toBeDefined();
      expect(result.retryAfterMs).toBeGreaterThanOrEqual(0);
    });

    it("возвращает retryAfterMs при превышении лимита", () => {
      const key = "test-key-3";
      const limit = 1;
      const windowMs = 1000;

      rateLimit(key, limit, windowMs);
      const result = rateLimit(key, limit, windowMs);
      expect(result.ok).toBe(false);
      expect(result.retryAfterMs).toBeDefined();
      expect(result.retryAfterMs).toBeLessThanOrEqual(windowMs);
    });

    it("разрешает запросы после истечения окна", async () => {
      const key = "test-key-4";
      const limit = 1;
      const windowMs = 100; // 100ms окно для быстрого теста

      rateLimit(key, limit, windowMs);
      expect(rateLimit(key, limit, windowMs).ok).toBe(false);

      // Ждем истечения окна
      await new Promise((resolve) => setTimeout(resolve, windowMs + 50));

      // После истечения окна должен быть разрешен
      expect(rateLimit(key, limit, windowMs).ok).toBe(true);
    });

    it("использует разные ключи независимо", () => {
      const key1 = "key-1";
      const key2 = "key-2";
      const limit = 1;
      const windowMs = 1000;

      rateLimit(key1, limit, windowMs);
      expect(rateLimit(key1, limit, windowMs).ok).toBe(false);

      // key2 должен работать независимо
      expect(rateLimit(key2, limit, windowMs).ok).toBe(true);
      expect(rateLimit(key2, limit, windowMs).ok).toBe(false);
    });
  });

  describe("отключение в production", () => {
    it("всегда разрешает если NODE_ENV === production", () => {
      process.env.NODE_ENV = "production";
      process.env.ENABLE_QA = "true";

      const key = "prod-key";
      const limit = 1;
      const windowMs = 1000;

      // Даже после многих запросов должно быть ok
      for (let i = 0; i < 10; i++) {
        const result = rateLimit(key, limit, windowMs);
        expect(result.ok).toBe(true);
      }
    });

    it("всегда разрешает если ENABLE_QA !== true", () => {
      process.env.NODE_ENV = "development";
      process.env.ENABLE_QA = "false";

      const key = "no-qa-key";
      const limit = 1;
      const windowMs = 1000;

      for (let i = 0; i < 10; i++) {
        const result = rateLimit(key, limit, windowMs);
        expect(result.ok).toBe(true);
      }
    });
  });
});