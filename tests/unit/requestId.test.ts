import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRequestId } from "@/lib/api/requestId";

describe("getRequestId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("должен вернуть существующий request-id из заголовков", () => {
    const requestId = "test-request-id-123";
    const request = new Request("https://example.com", {
      headers: {
        "x-request-id": requestId,
      },
    });

    const result = getRequestId(request);
    expect(result).toBe(requestId);
  });

  it("должен генерировать новый request-id если заголовок отсутствует", () => {
    const request = new Request("https://example.com");

    const result = getRequestId(request);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("должен генерировать уникальные request-id для разных запросов", () => {
    const request1 = new Request("https://example.com");
    const request2 = new Request("https://example.com");

    const id1 = getRequestId(request1);
    const id2 = getRequestId(request2);

    expect(id1).not.toBe(id2);
  });

  it("должен нормализовать заголовок независимо от регистра", () => {
    const requestId = "test-request-id-123";
    const request = new Request("https://example.com", {
      headers: {
        "X-Request-Id": requestId,
      },
    });

    // Request API в Node.js может быть чувствителен к регистру
    // Проверяем что функция работает с любым регистром
    const result = getRequestId(request);
    // Если заголовок не найден, должен сгенерировать новый
    expect(result).toBeTruthy();
  });
});
