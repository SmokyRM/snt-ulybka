import { normalizeRole, isOfficeRole } from "./rbac";

export type SessionRole =
  | "user"
  | "admin"
  | "board"
  | "accountant"
  | "operator"
  | "resident"
  | "resident_debtor"
  | "chairman"
  | "secretary";

/**
 * Вычисляет effectiveRole с учётом приоритета staff ролей из cookie над QA override
 * 
 * КРИТИЧНО: Если role из cookie это staff роль (admin/chairman/secretary/accountant),
 * она НЕ должна перезаписываться QA override для resident.
 * 
 * @param role - роль из cookie (уже нормализована через normalizeRole)
 * @param qaCookie - значение QA cookie (для тестирования)
 * @param isDev - режим разработки
 * @returns effectiveRole для использования в middleware
 */
export function computeEffectiveRole(
  role: SessionRole | null,
  qaCookie: string | null,
  isDev: boolean
): SessionRole | null {
  // Если QA не включен, просто возвращаем роль из cookie
  if (!isDev) {
    return role;
  }

  // QA cookie override логика
  if (qaCookie === "guest") {
    return null;
  }

  if (qaCookie === "resident_ok" || qaCookie === "resident_debtor" || qaCookie === "resident") {
    // QA: resident override - только если role из cookie НЕ staff роль
    if (role && (normalizeRole(role) === "admin" || isOfficeRole(role))) {
      // КРИТИЧНО: Если role это staff роль - игнорируем QA override для resident
      // Это предотвращает перезапись staff ролей в resident
      return role;
    } else {
      return "resident";
    }
  }

  if (qaCookie === "chairman" || qaCookie === "accountant" || qaCookie === "secretary" || qaCookie === "admin") {
    // QA: staff role override
    return qaCookie as SessionRole;
  }

  // Нет QA - используем role из cookie напрямую (уже нормализован)
  // КРИТИЧНО: role из cookie имеет абсолютный приоритет для staff ролей
  return role;
}
