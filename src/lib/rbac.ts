// Базовые роли для RBAC, включая гостя для неавторизованных пользователей
export type Role = "guest" | "resident" | "chairman" | "secretary" | "accountant" | "admin";

// Единый список разрешений (permissions) для кабинетов и офиса
export type Capability =
  | "office.access"
  | "office.finance.view"
  | "office.announcements.read"
  | "office.announcements.write"
  | "office.appeals.read"
  | "office.appeals.comment"
  | "office.appeals.status"
  | "admin.access"
  | "admin.qa"
  // дополнительные capability для обратной совместимости с существующим кодом
  | "cabinet.access"
  | "office.finance.read"
  | "office.announcements.edit";

type CapabilityMatrix = Record<Role, Set<Capability>>;

// Матрица прав по ролям:
// - admin имеет все права
// - resident только кабинет / публичные разделы (office.* отсутствуют)
// - staff (chairman / accountant / secretary) имеют доступ только к офису и части прав
const capabilityMatrix: CapabilityMatrix = {
  guest: new Set<Capability>(),
  resident: new Set<Capability>(["cabinet.access"]),
  chairman: new Set<Capability>([
    "cabinet.access",
    "office.access",
    "office.finance.view",
    "office.finance.read",
    "office.announcements.read",
    "office.announcements.write",
    "office.announcements.edit",
    "office.appeals.read",
    "office.appeals.comment",
    "office.appeals.status",
  ]),
  secretary: new Set<Capability>([
    "cabinet.access",
    "office.access",
    "office.announcements.read",
    "office.announcements.write",
    "office.announcements.edit",
    "office.appeals.read",
    "office.appeals.comment",
  ]),
  accountant: new Set<Capability>([
    "cabinet.access",
    "office.access",
    "office.finance.view",
    "office.finance.read",
    "office.appeals.read",
  ]),
  admin: new Set<Capability>([
    "admin.access",
    "admin.qa",
    "cabinet.access",
    "office.access",
    "office.finance.view",
    "office.finance.read",
    "office.announcements.read",
    "office.announcements.write",
    "office.announcements.edit",
    "office.appeals.read",
    "office.appeals.comment",
    "office.appeals.status",
  ]),
};

// Новый API: canAccess / forbiddenReason

export function canAccess(role: Role | null | undefined, capability: Capability): boolean {
  const normalizedRole: Role = role ?? "guest";
  return capabilityMatrix[normalizedRole]?.has(capability) ?? false;
}

// Короткие русские причины, пригодные для отображения пользователю
export function forbiddenReason(role: Role | null | undefined, capability: Capability): string {
  const normalizedRole: Role = role ?? "guest";

  if (capability === "admin.access") {
    if (normalizedRole === "guest" || normalizedRole === "resident") {
      return "Админ-панель доступна только администраторам";
    }
    return "Нет прав администратора";
  }

  if (capability === "admin.qa") {
    return "Нет доступа к QA-инструментам";
  }

  if (capability === "office.access") {
    if (normalizedRole === "guest" || normalizedRole === "resident") {
      return "Нет доступа в офис СНТ";
    }
    return "Раздел офиса недоступен для этой роли";
  }

  if (capability === "office.finance.view" || capability === "office.finance.read") {
    return "Нет доступа к финансовому разделу";
  }

  if (capability === "office.announcements.read" || capability === "office.announcements.write") {
    return "Нет доступа к объявлениям";
  }

  if (capability === "office.appeals.read" || capability === "office.appeals.comment" || capability === "office.appeals.status") {
    return "Нет доступа к обращениям жителей";
  }

  if (capability === "cabinet.access") {
    if (normalizedRole === "guest") {
      return "Войдите, чтобы открыть кабинет";
    }
    return "Этот кабинет недоступен для вашей роли";
  }

  return "Недостаточно прав для доступа";
}

// Старый API, сохранён для обратной совместимости с существующим кодом

export function can(role: Role, capability: Capability): boolean {
  return canAccess(role, capability);
}

export function defaultPathForRole(role: Role): string {
  if (role === "guest") return "/";
  if (role === "admin") return "/admin";
  if (role === "chairman" || role === "accountant" || role === "secretary") return "/office";
  return "/cabinet";
}

export const getDefaultRouteForRole = defaultPathForRole;

// Машинные коды причин для передачи в /forbidden?reason=...
export function getForbiddenReason(role: Role, capability: Capability): string {
  if (capability === "admin.access") {
    if (role === "guest" || role === "resident") return "admin.resident";
    if (role === "chairman" || role === "accountant" || role === "secretary") return "admin.staff";
    return "admin.unknown";
  }
  if (capability === "office.access") {
    if (role === "guest" || role === "resident") return "office.resident";
    return "office.unknown";
  }
  if (capability === "cabinet.access") {
    if (role === "resident") return "cabinet.unknown";
    if (role === "chairman" || role === "accountant" || role === "secretary" || role === "admin") {
      return "cabinet.staff";
    }
    return "cabinet.unknown";
  }
  if (capability === "office.finance.view" || capability === "office.finance.read") {
    return "office.finance.forbidden";
  }
  if (capability === "office.announcements.read" || capability === "office.announcements.write") {
    return "office.announcements.forbidden";
  }
  if (capability === "office.appeals.read" || capability === "office.appeals.comment" || capability === "office.appeals.status") {
    return "office.appeals.forbidden";
  }
  if (capability === "admin.qa") {
    return "admin.qa.forbidden";
  }
  return "permission.denied";
}
