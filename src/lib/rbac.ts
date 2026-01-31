import type { Role as PermissionsRole } from "./permissions";
import { can as canPermission } from "./permissions";

export type Role = PermissionsRole;
export type OfficeRole = "chairman" | "secretary" | "accountant";
export type AdminRole = "admin";
export type SessionRole = "guest" | "resident" | OfficeRole | "admin";

/**
 * Нормализует роль из различных вариантов в стандартный формат
 * Маппинг: 'administrator'/'Администратор'/'admin' -> 'admin'
 * Также обрабатывает другие варианты ролей
 */
export function normalizeRole(
  rawRole: string | null | undefined
): "admin" | "resident" | "chairman" | "secretary" | "accountant" | "guest" {
  if (!rawRole) return "guest";

  const v = String(rawRole).trim().toLowerCase();

  // Маппинг администратора
  if (["admin", "administrator", "администратор", "админ"].includes(v)) {
    return "admin";
  }

  // Маппинг председателя - ВАЖНО: ДО проверки resident/user
  if (["chairman", "председатель", "пред"].includes(v)) {
    return "chairman";
  }

  // Маппинг секретаря - ВАЖНО: ДО проверки resident/user
  if (["secretary", "секретарь", "сек"].includes(v)) {
    return "secretary";
  }

  // Маппинг бухгалтера - ВАЖНО: ДО проверки resident/user
  if (["accountant", "бухгалтер", "бух"].includes(v)) {
    return "accountant";
  }

  // Маппинг жителя - ПОСЛЕ проверки office ролей
  if (["resident", "user", "житель", "член снт", "member", "resident_debtor"].includes(v)) {
    return "resident";
  }

  // КРИТИЧНО: Неизвестные значения -> "guest", НЕ "resident"
  // Это предотвращает превращение office ролей в resident
  return "guest";
}

export const isOfficeRole = (role: string | null | undefined): role is OfficeRole => {
  return role === "chairman" || role === "secretary" || role === "accountant";
};

export function isStaffOrAdmin(role: string | null | undefined): boolean {
  return role === "admin" || isOfficeRole(role ?? null);
}

export const isAdminRole = (role: string | null | undefined): role is AdminRole => {
  return normalizeRole(role) === "admin";
};

export const isResidentRole = (role: string | null | undefined): boolean => {
  return normalizeRole(role) === "resident";
};

export const assertOfficeRole = (role: string | null | undefined): OfficeRole => {
  if (isOfficeRole(role)) return role;
  throw new Error("FORBIDDEN");
};

export const assertAdminRole = (role: string | null | undefined): AdminRole => {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "admin";
  throw new Error("FORBIDDEN");
};

export const assertResidentRole = (role: string | null | undefined): "resident" => {
  const normalized = normalizeRole(role);
  if (normalized === "resident") return "resident";
  throw new Error("FORBIDDEN");
};

export type Permission =
  | "office.view"
  | "appeals.view"
  | "appeals.manage"
  | "appeals.bulk_update"
  | "appeals.run_reminders"
  | "announcements.view"
  | "announcements.manage"
  | "registry.view"
  | "finance.view"
  | "finance.export"
  | "finance.manage";

const permissionMatrix: Record<Role, Permission[]> = {
  admin: [
    "office.view",
    "appeals.view",
    "appeals.manage",
    "appeals.bulk_update",
    "appeals.run_reminders",
    "announcements.view",
    "announcements.manage",
    "registry.view",
    "finance.view",
    "finance.export",
    "finance.manage",
  ],
  chairman: [
    "office.view",
    "appeals.view",
    "appeals.manage",
    "appeals.bulk_update",
    "appeals.run_reminders",
    "announcements.view",
    "announcements.manage",
    "registry.view",
    "finance.view",
  ],
  secretary: [
    "office.view",
    "appeals.view",
    "appeals.manage",
    "appeals.bulk_update",
    "announcements.view",
    "announcements.manage",
    "registry.view",
    "finance.view",
  ],
  accountant: [
    "office.view",
    "appeals.view",
    "announcements.view",
    "registry.view",
    "finance.view",
    "finance.export",
    "finance.manage",
  ],
  resident: [],
};

export const hasPermission = (role: Role | null | undefined, permission: Permission): boolean => {
  if (!role) return false;
  const perms = permissionMatrix[role];
  if (!perms) return false;
  if (permission === "office.view") return perms.includes("office.view");
  return perms.includes(permission);
};

export const assertPermission = (role: Role | null | undefined, permission: Permission) => {
  if (!hasPermission(role, permission)) throw new Error("FORBIDDEN");
};

export const assertCan = (role: Role | null | undefined, action: string, entityType?: string) => {
  if (!role || !can(role, action, entityType)) {
    throw new Error("FORBIDDEN");
  }
};

export const can = (role: Role, action: string, entityType?: string): boolean => {
  // Проверка доступа к разделам
  if (action === "cabinet.access") {
    return (
      role === "resident" ||
      role === "admin" ||
      role === "chairman" ||
      role === "accountant" ||
      role === "secretary"
    );
  }
  if (action === "admin.access") {
    return role === "admin";
  }
  if (action === "office.access") {
    return role === "admin" || role === "chairman" || role === "accountant" || role === "secretary";
  }

  // Проверка действий с обращениями (appeal.*)
  if (entityType === "appeal") {
    if (action === "appeal.read") {
      // chairman/secretary/admin/accountant могут читать
      return role === "admin" || role === "chairman" || role === "secretary" || role === "accountant";
    }
    if (action === "appeal.updateStatus") {
      // только chairman/secretary/admin могут менять статус
      return role === "admin" || role === "chairman" || role === "secretary";
    }
    if (action === "appeal.comment") {
      // chairman/secretary/admin/accountant могут комментировать
      return role === "admin" || role === "chairman" || role === "secretary" || role === "accountant";
    }
    if (action === "appeal.assign") {
      // chairman/secretary/accountant/admin могут назначать
      return role === "admin" || role === "chairman" || role === "secretary" || role === "accountant";
    }
    // По умолчанию для appeal - запрещено для resident/guest
    return false;
  }

  // Проверка действий с объявлениями (announcement.*)
  if (entityType === "announcement") {
    if (action === "announcement.read" || action === "announcements.view") {
      // chairman/secretary/admin/accountant могут читать
      return role === "admin" || role === "chairman" || role === "secretary" || role === "accountant";
    }
    if (action === "announcement.create" || action === "announcement.update" || action === "announcement.publish" || action === "announcements.manage") {
      // только chairman/secretary/admin могут создавать/редактировать/публиковать
      return role === "admin" || role === "chairman" || role === "secretary";
    }
    // По умолчанию для announcement - запрещено для resident/guest
    return false;
  }

  // Проверка действий с шаблонами (template.*)
  if (entityType === "template") {
    if (action === "template.read" || action === "templates.read") {
      // chairman/secretary/admin могут читать (accountant по умолчанию hidden)
      return role === "admin" || role === "chairman" || role === "secretary";
    }
    if (action === "template.create" || action === "template.update" || action === "template.delete" || action === "templates.manage") {
      // только secretary/admin могут создавать/редактировать/удалять
      return role === "admin" || role === "secretary";
    }
    // По умолчанию для template - запрещено для resident/guest/accountant
    return false;
  }

  // Проверка действий с финансами (finance.*)
  if (entityType === "finance") {
    if (action === "finance.read" || action === "finance.view") {
      // accountant/admin могут читать, chairman может читать (или deny по матрице)
      return role === "admin" || role === "accountant" || role === "chairman";
    }
    if (action === "finance.mutate" || action === "finance.import" || action === "finance.manage") {
      // только accountant/admin могут изменять
      return role === "admin" || role === "accountant";
    }
    if (action === "finance.export") {
      // accountant/admin могут экспортировать
      return role === "admin" || role === "accountant";
    }
    // По умолчанию для finance - запрещено для resident/guest/secretary
    return false;
  }

  // Обратная совместимость со старыми проверками
  if (action === "appeals.updateStatus") {
    return role === "admin" || role === "chairman" || role === "secretary";
  }
  if (action === "appeals.comment") {
    return role === "admin" || role === "chairman" || role === "secretary" || role === "accountant";
  }

  // Проверка через permissions
  return canPermission(role, action as Permission);
};

export const canAccess = can;

export const getForbiddenReason = (role: Role | null | undefined, capability?: string): string => {
  if (!role) return "auth.required";
  if (capability === "admin.access") return "admin.only";
  if (capability === "office.access") return "office.only";
  if (capability === "cabinet.access") return "cabinet.only";
  return "forbidden";
};

export const defaultPathForRole = (role: Role): string => {
  if (role === "admin") return "/admin";
  if (role === "resident") return "/cabinet";
  return "/office";
};
