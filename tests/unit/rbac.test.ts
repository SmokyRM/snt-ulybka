import { describe, it, expect } from "vitest";
import {
  normalizeRole,
  isAdminRole,
  isOfficeRole,
  isResidentRole,
  assertAdminRole,
  assertOfficeRole,
  assertResidentRole,
  can,
  hasPermission,
  defaultPathForRole,
  getForbiddenReason,
} from "@/lib/rbac";

describe("RBAC helpers", () => {
  describe("normalizeRole", () => {
    it("нормализует admin роли", () => {
      expect(normalizeRole("admin")).toBe("admin");
      expect(normalizeRole("administrator")).toBe("admin");
      expect(normalizeRole("Администратор")).toBe("admin");
      expect(normalizeRole("админ")).toBe("admin");
    });

    it("нормализует resident роли", () => {
      expect(normalizeRole("resident")).toBe("resident");
      expect(normalizeRole("user")).toBe("resident");
      expect(normalizeRole("житель")).toBe("resident");
    });

    it("нормализует office роли", () => {
      expect(normalizeRole("chairman")).toBe("chairman");
      expect(normalizeRole("secretary")).toBe("secretary");
      expect(normalizeRole("accountant")).toBe("accountant");
    });

    it("возвращает guest для неизвестных ролей", () => {
      expect(normalizeRole("unknown")).toBe("guest");
      expect(normalizeRole(null)).toBe("guest");
      expect(normalizeRole(undefined)).toBe("guest");
      expect(normalizeRole("")).toBe("guest");
    });
  });

  describe("isAdminRole", () => {
    it("возвращает true для admin", () => {
      expect(isAdminRole("admin")).toBe(true);
      expect(isAdminRole("administrator")).toBe(true);
      expect(isAdminRole("Администратор")).toBe(true);
    });

    it("возвращает false для других ролей", () => {
      expect(isAdminRole("resident")).toBe(false);
      expect(isAdminRole("chairman")).toBe(false);
      expect(isAdminRole(null)).toBe(false);
    });
  });

  describe("isOfficeRole", () => {
    it("возвращает true для office ролей", () => {
      expect(isOfficeRole("admin")).toBe(true);
      expect(isOfficeRole("chairman")).toBe(true);
      expect(isOfficeRole("secretary")).toBe(true);
      expect(isOfficeRole("accountant")).toBe(true);
    });

    it("возвращает false для resident и guest", () => {
      expect(isOfficeRole("resident")).toBe(false);
      expect(isOfficeRole("guest")).toBe(false);
      expect(isOfficeRole(null)).toBe(false);
    });
  });

  describe("isResidentRole", () => {
    it("возвращает true для resident", () => {
      expect(isResidentRole("resident")).toBe(true);
      expect(isResidentRole("user")).toBe(true);
    });

    it("возвращает false для других ролей", () => {
      expect(isResidentRole("admin")).toBe(false);
      expect(isResidentRole("chairman")).toBe(false);
      expect(isResidentRole(null)).toBe(false);
    });
  });

  describe("assertAdminRole", () => {
    it("возвращает admin для валидной роли", () => {
      expect(assertAdminRole("admin")).toBe("admin");
      expect(assertAdminRole("administrator")).toBe("admin");
    });

    it("выбрасывает ошибку для невалидной роли", () => {
      expect(() => assertAdminRole("resident")).toThrow("FORBIDDEN");
      expect(() => assertAdminRole(null)).toThrow("FORBIDDEN");
    });
  });

  describe("assertOfficeRole", () => {
    it("возвращает роль для валидных office ролей", () => {
      expect(assertOfficeRole("admin")).toBe("admin");
      expect(assertOfficeRole("chairman")).toBe("chairman");
      expect(assertOfficeRole("secretary")).toBe("secretary");
      expect(assertOfficeRole("accountant")).toBe("accountant");
    });

    it("выбрасывает ошибку для невалидной роли", () => {
      expect(() => assertOfficeRole("resident")).toThrow("FORBIDDEN");
      expect(() => assertOfficeRole(null)).toThrow("FORBIDDEN");
    });
  });

  describe("assertResidentRole", () => {
    it("возвращает resident для валидной роли", () => {
      expect(assertResidentRole("resident")).toBe("resident");
      expect(assertResidentRole("user")).toBe("resident");
    });

    it("выбрасывает ошибку для невалидной роли", () => {
      expect(() => assertResidentRole("admin")).toThrow("FORBIDDEN");
      expect(() => assertResidentRole(null)).toThrow("FORBIDDEN");
    });
  });

  describe("can", () => {
    it("проверяет admin.access", () => {
      expect(can("admin", "admin.access")).toBe(true);
      expect(can("resident", "admin.access")).toBe(false);
      expect(can("chairman", "admin.access")).toBe(false);
    });

    it("проверяет office.access", () => {
      expect(can("admin", "office.access")).toBe(true);
      expect(can("chairman", "office.access")).toBe(true);
      expect(can("secretary", "office.access")).toBe(true);
      expect(can("accountant", "office.access")).toBe(true);
      expect(can("resident", "office.access")).toBe(false);
    });

    it("проверяет cabinet.access", () => {
      expect(can("resident", "cabinet.access")).toBe(true);
      expect(can("admin", "cabinet.access")).toBe(true);
      expect(can("chairman", "cabinet.access")).toBe(true);
      expect(can("secretary", "cabinet.access")).toBe(true);
      expect(can("accountant", "cabinet.access")).toBe(true);
    });
  });

  describe("hasPermission", () => {
    it("проверяет разрешения для admin", () => {
      expect(hasPermission("admin", "office.view")).toBe(true);
      expect(hasPermission("admin", "finance.manage")).toBe(true);
    });

    it("проверяет разрешения для accountant", () => {
      expect(hasPermission("accountant", "finance.manage")).toBe(true);
      expect(hasPermission("accountant", "appeals.manage")).toBe(false);
    });

    it("возвращает false для resident", () => {
      expect(hasPermission("resident", "office.view")).toBe(false);
    });
  });

  describe("defaultPathForRole", () => {
    it("возвращает правильные пути", () => {
      expect(defaultPathForRole("admin")).toBe("/admin");
      expect(defaultPathForRole("resident")).toBe("/cabinet");
      expect(defaultPathForRole("chairman")).toBe("/office");
      expect(defaultPathForRole("secretary")).toBe("/office");
      expect(defaultPathForRole("accountant")).toBe("/office");
    });
  });

  describe("getForbiddenReason", () => {
    it("возвращает правильные причины", () => {
      expect(getForbiddenReason(null)).toBe("auth.required");
      expect(getForbiddenReason("resident", "admin.access")).toBe("admin.only");
      expect(getForbiddenReason("resident", "office.access")).toBe("office.only");
      expect(getForbiddenReason("admin", "cabinet.access")).toBe("cabinet.only");
      expect(getForbiddenReason("resident")).toBe("forbidden");
    });
  });
});
