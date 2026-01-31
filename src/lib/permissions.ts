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

export type PermissionAction =
  | "admin.manage_users"
  | "billing.view_debtors"
  | "billing.import_statement"
  | "billing.match_payments_manual"
  | "billing.import"
  | "billing.import.excel"
  | "billing.reconcile"
  | "billing.allocate"
  | "billing.generate"
  | "billing.export"
  | "billing.receipts"
  | "billing.penalty.apply"
  | "billing.penalty.recalc"
  | "billing.penalty.void"
  | "billing.penalty.freeze"
  | "registry.view"
  | "registry.edit"
  | "registry.merge"
  | "appeals.view"
  | "appeals.manage"
  | "appeals.assign"
  | "appeals.update_status"
  | "appeals.bulk_update"
  | "appeals.run_reminders"
  | "notifications.send"
  | "notifications.manage"
  | "notifications.generate_campaign";

const allActions: PermissionAction[] = [
  "admin.manage_users",
  "billing.view_debtors",
  "billing.import_statement",
  "billing.match_payments_manual",
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
  "appeals.assign",
  "appeals.update_status",
  "appeals.bulk_update",
  "appeals.run_reminders",
  "notifications.send",
  "notifications.manage",
  "notifications.generate_campaign",
];

const actionPermissions: Record<Role, Set<PermissionAction>> = {
  admin: new Set(allActions),
  chairman: new Set([
    "billing.view_debtors",
    "billing.import_statement",
    "billing.match_payments_manual",
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
    "appeals.assign",
    "appeals.update_status",
    "appeals.bulk_update",
    "appeals.run_reminders",
    "notifications.send",
    "notifications.manage",
    "notifications.generate_campaign",
  ]),
  accountant: new Set([
    "billing.view_debtors",
    "billing.import_statement",
    "billing.match_payments_manual",
    "billing.import",
    "billing.import.excel",
    "billing.reconcile",
    "billing.allocate",
    "billing.generate",
    "billing.export",
    "billing.receipts",
    "billing.penalty.apply",
    "billing.penalty.recalc",
    "billing.penalty.freeze",
  ]),
  secretary: new Set([
    "appeals.view",
    "appeals.manage",
    "appeals.assign",
    "appeals.update_status",
    "appeals.bulk_update",
    "registry.view",
    "registry.edit",
  ]),
  resident: new Set(),
};

export const hasPermission = (role: Role | null | undefined, action: PermissionAction): boolean => {
  if (!role) return false;
  if (role === "admin") return true;
  return actionPermissions[role]?.has(action) ?? false;
};
