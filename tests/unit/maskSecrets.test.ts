import { describe, expect, it } from "vitest";
import { maskSecrets } from "@/lib/security/maskSecrets";

describe("maskSecrets", () => {
  describe("маскирует вложенные поля password/token/cookie/authorization", () => {
    it("маскирует password в корневом объекте", () => {
      const input = { username: "user", password: "secret123" };
      const result = maskSecrets(input) as typeof input;
      expect(result.username).toBe("user");
      expect(result.password).toBe("***");
    });

    it("маскирует token в корневом объекте", () => {
      const input = { userId: "123", token: "abc123token" };
      const result = maskSecrets(input) as typeof input;
      expect(result.userId).toBe("123");
      expect(result.token).toBe("***");
    });

    it("маскирует cookie в корневом объекте", () => {
      const input = { userId: "user123", cookie: "cookie-value" };
      const result = maskSecrets(input) as typeof input;
      expect(result.userId).toBe("user123");
      expect(result.cookie).toBe("***");
    });

    it("маскирует authorization в корневом объекте", () => {
      const input = { action: "login", authorization: "Bearer token123" };
      const result = maskSecrets(input) as typeof input;
      expect(result.action).toBe("login");
      expect(result.authorization).toBe("***");
    });

    it("маскирует secret в корневом объекте", () => {
      const input = { name: "test", secret: "my-secret" };
      const result = maskSecrets(input) as typeof input;
      expect(result.name).toBe("test");
      expect(result.secret).toBe("***");
    });

    it("маскирует session в корневом объекте", () => {
      const input = { userId: "123", session: "session-data" };
      const result = maskSecrets(input) as typeof input;
      expect(result.userId).toBe("123");
      expect(result.session).toBe("***");
    });

    it("маскирует вложенные секреты", () => {
      const input = {
        user: {
          name: "John",
          password: "secret123",
        },
        meta: {
          token: "token456",
        },
      };
      const result = maskSecrets(input) as typeof input;
      expect(result.user.name).toBe("John");
      expect(result.user.password).toBe("***");
      expect(result.meta.token).toBe("***");
    });

    it("маскирует секреты в массивах", () => {
      const input = [
        { id: 1, password: "pass1" },
        { id: 2, token: "token1" },
      ];
      const result = maskSecrets(input) as typeof input;
      expect(result[0].id).toBe(1);
      expect(result[0].password).toBe("***");
      expect(result[1].id).toBe(2);
      expect(result[1].token).toBe("***");
    });

    it("маскирует case-insensitive ключи", () => {
      const input = {
        Password: "pass1",
        TOKEN: "token1",
        Authorization: "auth1",
      };
      const result = maskSecrets(input) as typeof input;
      expect(result.Password).toBe("***");
      expect(result.TOKEN).toBe("***");
      expect(result.Authorization).toBe("***");
    });

    it("маскирует ключи содержащие секретные слова", () => {
      const input = {
        userPassword: "pass1",
        apiToken: "token1",
        sessionCookie: "cookie1",
      };
      const result = maskSecrets(input) as typeof input;
      expect(result.userPassword).toBe("***");
      expect(result.apiToken).toBe("***");
      expect(result.sessionCookie).toBe("***");
    });
  });

  describe("не меняет другие поля", () => {
    it("не меняет обычные поля", () => {
      const input = {
        username: "user",
        email: "user@example.com",
        age: 30,
        active: true,
      };
      const result = maskSecrets(input) as typeof input;
      expect(result).toEqual(input);
    });

    it("не меняет примитивные типы", () => {
      expect(maskSecrets(null)).toBe(null);
      expect(maskSecrets(undefined)).toBe(undefined);
      expect(maskSecrets(123)).toBe(123);
      expect(maskSecrets("string")).toBe("string");
      expect(maskSecrets(true)).toBe(true);
    });

    it("не меняет структуру объектов", () => {
      const input = {
        level1: {
          level2: {
            level3: {
              value: "data",
            },
          },
        },
      };
      const result = maskSecrets(input) as typeof input;
      expect(result.level1.level2.level3.value).toBe("data");
    });

    it("обрабатывает смешанные объекты правильно", () => {
      const input = {
        public: "visible",
        password: "hidden",
        nested: {
          public: "visible",
          token: "hidden",
        },
      };
      const result = maskSecrets(input) as typeof input;
      expect(result.public).toBe("visible");
      expect(result.password).toBe("***");
      expect(result.nested.public).toBe("visible");
      expect(result.nested.token).toBe("***");
    });
  });
});