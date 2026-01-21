import { describe, expect, it } from "vitest";
import { edgeRequestId } from "../../proxy";

describe("edgeRequestId", () => {
  it("возвращает непустую строку", () => {
    const id = edgeRequestId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("возвращает разные значения при нескольких вызовах", () => {
    const id1 = edgeRequestId();
    const id2 = edgeRequestId();
    expect(id1).not.toBe(id2);
  });

  it("возвращает строку формата UUID-подобного идентификатора", () => {
    const id = edgeRequestId();
    // Допускаем только hex, дефисы и несколько сегментов
    expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(id.split("-").length).toBeGreaterThanOrEqual(2);
  });
});

