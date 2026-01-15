import { describe, it, expect } from "vitest";
import { computeEffectiveRole } from "@/lib/middleware-effective-role";

describe("computeEffectiveRole", () => {
  describe("приоритет staff ролей из cookie над QA resident override", () => {
    it("admin роль из cookie НЕ перезаписывается QA resident", () => {
      const effectiveRole = computeEffectiveRole("admin", "resident", true);
      expect(effectiveRole).toBe("admin");
    });

    it("chairman роль из cookie НЕ перезаписывается QA resident", () => {
      const effectiveRole = computeEffectiveRole("chairman", "resident", true);
      expect(effectiveRole).toBe("chairman");
    });

    it("secretary роль из cookie НЕ перезаписывается QA resident", () => {
      const effectiveRole = computeEffectiveRole("secretary", "resident", true);
      expect(effectiveRole).toBe("secretary");
    });

    it("accountant роль из cookie НЕ перезаписывается QA resident", () => {
      const effectiveRole = computeEffectiveRole("accountant", "resident", true);
      expect(effectiveRole).toBe("accountant");
    });

    it("admin роль из cookie НЕ перезаписывается QA resident_ok", () => {
      const effectiveRole = computeEffectiveRole("admin", "resident_ok", true);
      expect(effectiveRole).toBe("admin");
    });

    it("admin роль из cookie НЕ перезаписывается QA resident_debtor", () => {
      const effectiveRole = computeEffectiveRole("admin", "resident_debtor", true);
      expect(effectiveRole).toBe("admin");
    });
  });

  describe("QA resident override для non-staff ролей", () => {
    it("resident роль из cookie перезаписывается QA resident (без изменений)", () => {
      const effectiveRole = computeEffectiveRole("resident", "resident", true);
      expect(effectiveRole).toBe("resident");
    });

    it("null роль перезаписывается QA resident", () => {
      const effectiveRole = computeEffectiveRole(null, "resident", true);
      expect(effectiveRole).toBe("resident");
    });

    it("user роль перезаписывается QA resident", () => {
      const effectiveRole = computeEffectiveRole("user", "resident", true);
      expect(effectiveRole).toBe("resident");
    });
  });

  describe("QA staff role override", () => {
    it("QA admin override работает для любой роли", () => {
      expect(computeEffectiveRole("resident", "admin", true)).toBe("admin");
      expect(computeEffectiveRole("chairman", "admin", true)).toBe("admin");
      expect(computeEffectiveRole(null, "admin", true)).toBe("admin");
    });

    it("QA chairman override работает", () => {
      expect(computeEffectiveRole("resident", "chairman", true)).toBe("chairman");
      expect(computeEffectiveRole("admin", "chairman", true)).toBe("chairman");
    });

    it("QA secretary override работает", () => {
      expect(computeEffectiveRole("resident", "secretary", true)).toBe("secretary");
      expect(computeEffectiveRole("admin", "secretary", true)).toBe("secretary");
    });

    it("QA accountant override работает", () => {
      expect(computeEffectiveRole("resident", "accountant", true)).toBe("accountant");
      expect(computeEffectiveRole("admin", "accountant", true)).toBe("accountant");
    });
  });

  describe("QA guest override", () => {
    it("QA guest override делает роль null", () => {
      expect(computeEffectiveRole("admin", "guest", true)).toBe(null);
      expect(computeEffectiveRole("resident", "guest", true)).toBe(null);
      expect(computeEffectiveRole("chairman", "guest", true)).toBe(null);
    });
  });

  describe("без QA cookie", () => {
    it("возвращает роль из cookie если нет QA", () => {
      expect(computeEffectiveRole("admin", null, true)).toBe("admin");
      expect(computeEffectiveRole("resident", null, true)).toBe("resident");
      expect(computeEffectiveRole("chairman", null, true)).toBe("chairman");
      expect(computeEffectiveRole(null, null, true)).toBe(null);
    });
  });

  describe("production mode (isDev=false)", () => {
    it("игнорирует QA cookie в production", () => {
      expect(computeEffectiveRole("admin", "resident", false)).toBe("admin");
      expect(computeEffectiveRole("chairman", "resident", false)).toBe("chairman");
      expect(computeEffectiveRole("resident", "admin", false)).toBe("resident");
      expect(computeEffectiveRole(null, "admin", false)).toBe(null);
    });
  });
});
