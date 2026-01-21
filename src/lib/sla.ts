import type { AppealStatus } from "./office/types";

/**
 * Sprint 3.2: Единые функции для вычисления SLA статусов
 */

/**
 * Проверяет, просрочено ли обращение
 * 
 * @param dueAt - срок выполнения (ISO строка или null)
 * @param now - текущее время (по умолчанию new Date())
 * @returns true если просрочено, false иначе
 */
export function overdue(dueAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!dueAt) {
    return false;
  }
  const dueDate = new Date(dueAt);
  return dueDate < now;
}

/**
 * Проверяет, скоро ли срок выполнения (в ближайшие horizonHours часов)
 * 
 * @param dueAt - срок выполнения (ISO строка или null)
 * @param now - текущее время (по умолчанию new Date())
 * @param horizonHours - горизонт в часах (по умолчанию 48)
 * @returns true если скоро срок, false иначе
 */
export function dueSoon(
  dueAt: string | null | undefined,
  now: Date = new Date(),
  horizonHours: number = 48
): boolean {
  if (!dueAt) {
    return false;
  }
  const dueDate = new Date(dueAt);
  
  // Если уже просрочено, не считаем "скоро срок"
  if (dueDate < now) {
    return false;
  }
  
  // Проверяем, осталось ли меньше horizonHours часов
  const threshold = new Date(now);
  threshold.setHours(threshold.getHours() + horizonHours);
  return dueDate <= threshold;
}

/**
 * Проверяет, просрочено ли обращение (с учетом статуса)
 * Закрытые обращения не считаются просроченными
 * 
 * @param dueAt - срок выполнения (ISO строка или null)
 * @param status - статус обращения (закрытые не считаются просроченными)
 * @param now - текущее время (по умолчанию new Date())
 * @returns true если просрочено, false иначе
 */
export function isOverdue(
  dueAt: string | null | undefined,
  status?: AppealStatus,
  now: Date = new Date()
): boolean {
  if (status === "closed") {
    return false;
  }
  return overdue(dueAt, now);
}

/**
 * Проверяет, скоро ли срок выполнения (с учетом статуса)
 * Закрытые обращения не считаются
 * 
 * @param dueAt - срок выполнения (ISO строка или null)
 * @param status - статус обращения (закрытые не считаются)
 * @param now - текущее время (по умолчанию new Date())
 * @param horizonHours - горизонт в часах (по умолчанию 48)
 * @returns true если скоро срок, false иначе
 */
export function isDueSoon(
  dueAt: string | null | undefined,
  status?: AppealStatus,
  now: Date = new Date(),
  horizonHours: number = 48
): boolean {
  if (status === "closed") {
    return false;
  }
  return dueSoon(dueAt, now, horizonHours);
}
