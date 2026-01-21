import { isOverdue as checkOverdue, isDueSoon as checkDueSoon } from "./appealsSla";

/**
 * Единообразные стили для подсветки статусов SLA (dueSoon/overdue)
 * Используются во всех местах отображения обращений
 */

// Реэкспорт функций проверки для удобства
export { checkOverdue as isOverdue, checkDueSoon as isDueSoon };

/**
 * CSS классы для контейнера обращения в зависимости от статуса SLA
 */
export function getAppealSlaContainerClass(
  dueAt: string | null | undefined,
  status?: string
): string {
  if (!dueAt || status === "closed") {
    return "border-zinc-200 bg-white";
  }
  
  const dueDate = new Date(dueAt);
  const now = new Date();
  
  if (dueDate < now) {
    // Просрочено
    return "border-red-300 bg-red-50";
  }
  
  // Проверяем "скоро срок" (в пределах 24 часов)
  const threshold = new Date(now);
  threshold.setHours(threshold.getHours() + 24);
  
  if (dueDate <= threshold) {
    // Скоро срок
    return "border-amber-300 bg-amber-50";
  }
  
  return "border-zinc-200 bg-white";
}

/**
 * CSS классы для бейджа "Просрочено"
 */
export const OVERDUE_BADGE_CLASS = "inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800";

/**
 * CSS классы для бейджа "Скоро срок"
 */
export const DUE_SOON_BADGE_CLASS = "inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800";

/**
 * CSS классы для текста срока выполнения в зависимости от статуса SLA
 */
export function getDueDateTextClass(
  dueAt: string | null | undefined,
  status?: string
): string {
  if (!dueAt || status === "closed") {
    return "text-zinc-500";
  }
  
  const dueDate = new Date(dueAt);
  const now = new Date();
  
  if (dueDate < now) {
    // Просрочено
    return "text-red-600 font-semibold";
  }
  
  // Проверяем "скоро срок" (в пределах 24 часов)
  const threshold = new Date(now);
  threshold.setHours(threshold.getHours() + 24);
  
  if (dueDate <= threshold) {
    // Скоро срок
    return "text-amber-600 font-semibold";
  }
  
  return "text-zinc-500";
}
