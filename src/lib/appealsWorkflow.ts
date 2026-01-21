import type { AppealStatus } from "./office/types";

/**
 * State machine для переходов статусов обращений
 * Определяет допустимые переходы между статусами
 */
export type AppealStatusTransition = {
  from: AppealStatus;
  to: AppealStatus[];
};

/**
 * Допустимые переходы:
 * - new -> in_progress, needs_info, closed
 * - in_progress -> needs_info, closed
 * - needs_info -> in_progress, closed
 * - closed -> (нет переходов)
 */
export const ALLOWED_TRANSITIONS: AppealStatusTransition[] = [
  {
    from: "new",
    to: ["in_progress", "needs_info", "closed"],
  },
  {
    from: "in_progress",
    to: ["needs_info", "closed"],
  },
  {
    from: "needs_info",
    to: ["in_progress", "closed"],
  },
  {
    from: "closed",
    to: [], // Закрытые обращения не могут менять статус
  },
];

/**
 * Проверяет, допустим ли переход между статусами
 */
export function isTransitionAllowed(from: AppealStatus, to: AppealStatus): boolean {
  if (from === to) {
    return true; // Остаться в том же статусе допустимо
  }

  const transition = ALLOWED_TRANSITIONS.find((t) => t.from === from);
  if (!transition) {
    return false;
  }

  return transition.to.includes(to);
}

/**
 * Получить список допустимых переходов из текущего статуса
 */
export function getAllowedTransitions(from: AppealStatus): AppealStatus[] {
  const transition = ALLOWED_TRANSITIONS.find((t) => t.from === from);
  if (!transition) {
    return [];
  }
  return transition.to;
}

/**
 * Валидирует переход статуса и возвращает ошибку, если переход недопустим
 */
export function validateTransition(
  from: AppealStatus,
  to: AppealStatus,
): { valid: boolean; error?: string } {
  if (from === to) {
    return { valid: true };
  }

  if (!isTransitionAllowed(from, to)) {
    const allowed = getAllowedTransitions(from);
    return {
      valid: false,
      error: `Переход из статуса "${from}" в "${to}" недопустим. Допустимые переходы: ${allowed.length > 0 ? allowed.join(", ") : "нет"}`,
    };
  }

  return { valid: true };
}
