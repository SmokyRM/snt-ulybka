import { normalizeRole, isOfficeRole, isAdminRole } from "./rbac";

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
 * Вычисляет effectiveRole с учётом QA override
 *
 * Правила приоритета:
 * 1. QA guest override всегда делает роль null
 * 2. QA staff override (admin/chairman/secretary/accountant) работает для ЛЮБОЙ роли
 * 3. QA resident override работает только для non-staff ролей
 * 4. Staff роли из cookie (admin/office) защищены ТОЛЬКО от QA resident override
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

  // QA staff role override работает для ЛЮБОЙ роли (включая staff -> staff)
  if (qaCookie === "chairman" || qaCookie === "accountant" || qaCookie === "secretary" || qaCookie === "admin") {
    return qaCookie as SessionRole;
  }

  // QA resident override
  if (qaCookie === "resident_ok" || qaCookie === "resident_debtor" || qaCookie === "resident") {
    // КРИТИЧНО: Staff роли из cookie НЕ перезаписываются QA resident override
    // (иначе админ может быть случайно понижен до resident и потерять доступ)
    if (role && (isAdminRole(role) || isOfficeRole(role))) {
      return role;
    }
    return "resident";
  }

  // Нет QA - используем role из cookie напрямую
  return role;
}
