export type Role = "chairman" | "secretary" | "accountant" | "resident" | "admin";

export const isOfficeRole = (role: string | null | undefined): role is Role =>
  role === "chairman" || role === "secretary" || role === "accountant" || role === "admin";

const capabilityMap: Record<Role, Set<string>> = {
  chairman: new Set([
    "office.appeals.manage",
    "office.finance.manage",
    "office.registry.manage",
    "office.registry.read",
    "office.announcements.manage",
    "office.documents.manage",
  ]),
  secretary: new Set([
    "office.appeals.manage",
    "office.registry.read",
    "office.announcements.manage",
    "office.documents.manage",
  ]),
  accountant: new Set(["office.finance.manage", "office.registry.read", "office.registry.manage"]),
  resident: new Set<string>(),
  admin: new Set([
    "office.appeals.manage",
    "office.finance.manage",
    "office.registry.manage",
    "office.registry.read",
    "office.announcements.manage",
    "office.documents.manage",
  ]),
};

export const getOfficeCapabilities = (role: Role): Set<string> => capabilityMap[role] ?? new Set();

export const can = (role: Role, capability: string): boolean => capabilityMap[role]?.has(capability) ?? false;
