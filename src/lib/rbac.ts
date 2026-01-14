export type Role = "resident" | "chairman" | "secretary" | "accountant" | "admin";

export type Capability =
  | "admin.access"
  | "cabinet.access"
  | "office.access"
  | "office.finance.read"
  | "office.announcements.read"
  | "office.announcements.write"
  | "office.announcements.edit"
  | "office.appeals.read"
  | "office.appeals.comment"
  | "office.appeals.status";

type CapabilityMatrix = Record<Role, Set<Capability>>;

const capabilityMatrix: CapabilityMatrix = {
  resident: new Set(["cabinet.access"]),
  chairman: new Set([
    "cabinet.access",
    "office.access",
    "office.finance.read",
    "office.announcements.read",
    "office.announcements.write",
    "office.announcements.edit",
    "office.appeals.read",
    "office.appeals.comment",
    "office.appeals.status",
  ]),
  secretary: new Set([
    "cabinet.access",
    "office.access",
    "office.announcements.read",
    "office.announcements.write",
    "office.announcements.edit",
    "office.appeals.read",
    "office.appeals.comment",
  ]),
  accountant: new Set([
    "cabinet.access",
    "office.access",
    "office.finance.read",
    "office.appeals.read",
  ]),
  admin: new Set([
    "admin.access",
    "cabinet.access",
    "office.access",
    "office.finance.read",
    "office.announcements.read",
    "office.announcements.write",
    "office.announcements.edit",
    "office.appeals.read",
    "office.appeals.comment",
    "office.appeals.status",
  ]),
};

export function can(role: Role, capability: Capability): boolean {
  return capabilityMatrix[role]?.has(capability) ?? false;
}

export function defaultPathForRole(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "chairman" || role === "accountant" || role === "secretary") return "/office";
  return "/cabinet";
}

export function getForbiddenReason(role: Role, capability: Capability): string {
  if (capability === "admin.access") {
    if (role === "resident") return "admin.resident";
    if (role === "chairman" || role === "accountant" || role === "secretary") return "admin.staff";
    // admin всегда имеет admin.access, но на случай edge case:
    return "admin.unknown";
  }
  if (capability === "office.access") {
    if (role === "resident") return "office.resident";
    // chairman, accountant, secretary, admin всегда имеют office.access, но на случай edge case:
    return "office.unknown";
  }
  if (capability === "cabinet.access") {
    // resident всегда должен иметь cabinet.access, но на случай аномалии:
    if (role === "resident") return "cabinet.unknown";
    if (role === "chairman" || role === "accountant" || role === "secretary" || role === "admin") {
      return "cabinet.staff";
    }
    return "cabinet.unknown";
  }
  return "permission.denied";
}
