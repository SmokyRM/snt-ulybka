import { describe, expect, it } from "vitest";
import { sanitizeNextUrl } from "@/lib/security/sanitizeNextUrl";

describe("sanitizeNextUrl", () => {
  describe("допускает валидные относительные пути", () => {
    it("допускает /cabinet", () => {
      expect(sanitizeNextUrl("/cabinet")).toBe("/cabinet");
    });

    it("допускает /office/dashboard", () => {
      expect(sanitizeNextUrl("/office/dashboard")).toBe("/office/dashboard");
    });

    it("допускает /login?x=1 (путь с query параметрами)", () => {
      expect(sanitizeNextUrl("/login?x=1")).toBe("/login?x=1");
    });

    it("допускает /cabinet/appeals", () => {
      expect(sanitizeNextUrl("/cabinet/appeals")).toBe("/cabinet/appeals");
    });

    it("допускает /admin", () => {
      expect(sanitizeNextUrl("/admin")).toBe("/admin");
    });

    it("допускает /", () => {
      expect(sanitizeNextUrl("/")).toBe("/");
    });

    it("допускает пути с hash", () => {
      expect(sanitizeNextUrl("/cabinet#section")).toBe("/cabinet#section");
    });
  });

  describe("отклоняет внешние URL и протоколы", () => {
    it("отклоняет https://evil.com", () => {
      expect(sanitizeNextUrl("https://evil.com")).toBeNull();
    });

    it("отклоняет http://evil.com", () => {
      expect(sanitizeNextUrl("http://evil.com")).toBeNull();
    });

    it("отклоняет javascript:alert(1)", () => {
      expect(sanitizeNextUrl("javascript:alert(1)")).toBeNull();
    });

    it("отклоняет data:text/html,hi", () => {
      expect(sanitizeNextUrl("data:text/html,hi")).toBeNull();
    });

    it("отклоняет пути с протоколом в середине", () => {
      expect(sanitizeNextUrl("/cabinet?redirect=https://evil.com")).toBeNull();
    });
  });

  describe("отклоняет protocol-relative URLs", () => {
    it("отклоняет //evil.com", () => {
      expect(sanitizeNextUrl("//evil.com")).toBeNull();
    });

    it("отклоняет //evil.com/path", () => {
      expect(sanitizeNextUrl("//evil.com/path")).toBeNull();
    });
  });

  describe("отклоняет encoded //", () => {
    it("отклоняет %2F%2Fevil.com", () => {
      expect(sanitizeNextUrl("%2F%2Fevil.com")).toBeNull();
    });

    it("отклоняет %2f%2fevil.com (lowercase)", () => {
      expect(sanitizeNextUrl("%2f%2fevil.com")).toBeNull();
    });

    it("отклоняет пути с encoded // в середине", () => {
      expect(sanitizeNextUrl("/cabinet%2F%2Fevil.com")).toBeNull();
    });
  });

  describe("отклоняет backslash", () => {
    it("отклоняет \\evil", () => {
      expect(sanitizeNextUrl("\\evil")).toBeNull();
    });

    it("отклоняет /\\evil", () => {
      expect(sanitizeNextUrl("/\\evil")).toBeNull();
    });

    it("отклоняет пути с backslash в середине", () => {
      expect(sanitizeNextUrl("/cabinet\\evil")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("возвращает null для null", () => {
      expect(sanitizeNextUrl(null)).toBeNull();
    });

    it("возвращает null для undefined", () => {
      expect(sanitizeNextUrl(undefined)).toBeNull();
    });

    it("возвращает null для пустой строки", () => {
      expect(sanitizeNextUrl("")).toBeNull();
    });

    it("возвращает null для строки только с пробелами", () => {
      expect(sanitizeNextUrl("   ")).toBeNull();
    });

    it("trim пробелы и возвращает валидный путь", () => {
      expect(sanitizeNextUrl("  /cabinet  ")).toBe("/cabinet");
    });

    it("отклоняет путь без начального слеша", () => {
      expect(sanitizeNextUrl("cabinet")).toBeNull();
    });

    it("отклоняет относительный путь без слеша", () => {
      expect(sanitizeNextUrl("../../etc/passwd")).toBeNull();
    });

    it("отклоняет http:evil (без двойного слеша)", () => {
      expect(sanitizeNextUrl("http:evil")).toBeNull();
    });

    it("отклоняет https:evil (без двойного слеша)", () => {
      expect(sanitizeNextUrl("https:evil")).toBeNull();
    });
  });
});
