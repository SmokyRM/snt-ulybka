import { sanitizeNext } from "./sanitizeNext";

type Role = "admin" | "chairman" | "accountant" | "secretary" | "resident" | "user" | "board" | "operator";

export function defaultPathForRole(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "chairman" || role === "accountant" || role === "secretary" || role === "board") return "/office";
  return "/cabinet";
}

export function isPathAllowedForRole(role: Role, path: string | null | undefined): boolean {
  if (!path) return false;
  if (role === "admin") return path.startsWith("/admin");
  if (role === "chairman" || role === "accountant" || role === "secretary" || role === "board") {
    return path.startsWith("/office");
  }
  return path.startsWith("/cabinet");
}

export function getSafeRedirectUrl(role: Role, next: string | null | undefined): string {
  const sanitized = sanitizeNext(next);
  if (sanitized && isPathAllowedForRole(role, sanitized)) {
    return sanitized;
  }
  return defaultPathForRole(role);
}
