import { describe, expect, it } from "vitest";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";

describe("verifySameOrigin", () => {
  describe("ok: origin совпадает с host", () => {
    it("разрешает когда origin и host совпадают (без порта)", () => {
      const req = new Request("http://example.com/api/test", {
        headers: {
          host: "example.com",
          origin: "http://example.com",
        },
      });
      const result = verifySameOrigin(req);
      expect(result.ok).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("разрешает когда origin и host совпадают (с портом)", () => {
      const req = new Request("http://example.com:3000/api/test", {
        headers: {
          host: "example.com:3000",
          origin: "http://example.com:3000",
        },
      });
      const result = verifySameOrigin(req);
      expect(result.ok).toBe(true);
    });

    it("разрешает когда origin и host совпадают (default ports)", () => {
      const req = new Request("https://example.com/api/test", {
        headers: {
          host: "example.com",
          origin: "https://example.com",
        },
      });
      const result = verifySameOrigin(req);
      expect(result.ok).toBe(true);
    });

    it("разрешает когда используется referer вместо origin", () => {
      const req = new Request("http://example.com/api/test", {
        headers: {
          host: "example.com",
          referer: "http://example.com/page",
        },
      });
      const result = verifySameOrigin(req);
      expect(result.ok).toBe(true);
    });

    it("разрешает case-insensitive сравнение hostname", () => {
      const req = new Request("http://Example.com/api/test", {
        headers: {
          host: "example.com",
          origin: "http://EXAMPLE.COM",
        },
      });
      const result = verifySameOrigin(req);
      expect(result.ok).toBe(true);
    });
  });

  describe("fail: origin другой", () => {
    it("отклоняет когда origin hostname отличается", () => {
      const req = new Request("http://example.com/api/test", {
        headers: {
          host: "example.com",
          origin: "http://evil.com",
        },
      });
      const result = verifySameOrigin(req);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("hostname mismatch");
    });

    it("отклоняет когда origin порт отличается", () => {
      const req = new Request("http://example.com/api/test", {
        headers: {
          host: "example.com:3000",
          origin: "http://example.com:8080",
        },
      });
      const result = verifySameOrigin(req);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("port mismatch");
    });

    it("отклоняет когда origin имеет non-default порт, а host нет", () => {
      const req = new Request("http://example.com/api/test", {
        headers: {
          host: "example.com",
          origin: "http://example.com:8080",
        },
      });
      const result = verifySameOrigin(req);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("non-default port");
    });
  });

  describe("fail: origin отсутствует (для опасных endpoints)", () => {
    it("отклоняет когда origin отсутствует", () => {
      const req = new Request("http://example.com/api/test", {
        headers: {
          host: "example.com",
        },
      });
      const result = verifySameOrigin(req);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("Missing origin/referer");
    });

    it("отклоняет когда host отсутствует", () => {
      const req = new Request("http://example.com/api/test", {
        headers: {
          origin: "http://example.com",
        },
      });
      const result = verifySameOrigin(req);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("Missing host");
    });

    it("отклоняет когда origin невалидный URL", () => {
      const req = new Request("http://example.com/api/test", {
        headers: {
          host: "example.com",
          origin: "not-a-valid-url",
        },
      });
      const result = verifySameOrigin(req);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("Invalid origin URL");
    });
  });
});