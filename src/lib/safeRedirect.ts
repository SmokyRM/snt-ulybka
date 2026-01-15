import { sanitizeNext } from "./sanitizeNext";
import { type Role, defaultPathForRole as rbacDefaultPath } from "./rbac";

export function defaultPathForRole(role: Role | "user" | "board" | "operator"): string {
  // Нормализуем старые роли к новым типам RBAC
  const normalized: Role =
    role === "user" || role === "board"
      ? "resident"
      : role === "operator"
        ? "accountant" // operator имеет те же права что accountant (импорты, финансы)
        : role;
  return rbacDefaultPath(normalized);
}

export function isPathAllowedForRole(role: Role | "user" | "board" | "operator", path: string | null | undefined): boolean {
  if (!path) return false;
  // Нормализуем старые роли для консистентности
  const normalizedRole: Role | "operator" =
    role === "user" || role === "board" ? "resident" : role;
  
  if (normalizedRole === "admin") return path.startsWith("/admin");
  if (normalizedRole === "chairman" || normalizedRole === "accountant" || normalizedRole === "secretary" || normalizedRole === "operator") {
    return path.startsWith("/office");
  }
  if (normalizedRole === "resident") {
    return path.startsWith("/cabinet");
  }
  // Fallback для неизвестных ролей
  return path.startsWith("/cabinet");
}

export function getSafeRedirectUrl(role: Role | "user" | "board" | "operator", next: string | null | undefined): string {
  const sanitized = sanitizeNext(next);
  if (sanitized && isPathAllowedForRole(role, sanitized)) {
    return sanitized;
  }
  return defaultPathForRole(role);
}
