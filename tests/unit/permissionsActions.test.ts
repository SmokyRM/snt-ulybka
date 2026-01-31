import { describe, it, expect } from "vitest";
import { hasPermission, type PermissionAction } from "@/lib/permissions";

const actions: PermissionAction[] = [
  "billing.import",
  "billing.import.excel",
  "billing.reconcile",
  "billing.allocate",
  "billing.generate",
  "billing.export",
  "billing.receipts",
  "billing.penalty.apply",
  "billing.penalty.recalc",
  "billing.penalty.void",
  "billing.penalty.freeze",
  "registry.view",
  "registry.edit",
  "registry.merge",
  "appeals.view",
  "appeals.manage",
  "notifications.send",
  "notifications.manage",
];

describe("permissions actions", () => {
  it("admin has all permissions", () => {
    actions.forEach((action) => {
      expect(hasPermission("admin", action)).toBe(true);
    });
  });

  it("chairman has billing, registry, appeals, notifications", () => {
    expect(hasPermission("chairman", "billing.import")).toBe(true);
    expect(hasPermission("chairman", "registry.merge")).toBe(true);
    expect(hasPermission("chairman", "appeals.manage")).toBe(true);
    expect(hasPermission("chairman", "notifications.send")).toBe(true);
  });

  it("accountant has billing actions but not registry merge or penalty void", () => {
    expect(hasPermission("accountant", "billing.import")).toBe(true);
    expect(hasPermission("accountant", "billing.generate")).toBe(true);
    expect(hasPermission("accountant", "registry.merge")).toBe(false);
    expect(hasPermission("accountant", "billing.penalty.void")).toBe(false);
  });

  it("secretary has appeals and registry view/edit", () => {
    expect(hasPermission("secretary", "appeals.manage")).toBe(true);
    expect(hasPermission("secretary", "registry.view")).toBe(true);
    expect(hasPermission("secretary", "billing.import")).toBe(false);
  });

  it("resident has no office permissions", () => {
    expect(hasPermission("resident", "appeals.view")).toBe(false);
    expect(hasPermission("resident", "billing.export")).toBe(false);
  });
});
