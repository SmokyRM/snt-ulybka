import type { AppealStatus, AppealCategory } from "./office/types";

/**
 * SLA конфигурация для обращений по типам (категориям)
 * Определяет сроки выполнения (dueAt) в зависимости от типа обращения
 * Значения в часах
 */
export type SlaConfigByType = {
  [K in AppealCategory]?: number;
};

/**
 * Дефолтная SLA конфигурация по типам обращений:
 * 
 * Срочные (12-24 часа):
 * - access (Доступ/код) -> 12 часов (критично, блокирует доступ)
 * - electricity (Электроэнергия) -> 24 часа (1 день, влияет на комфорт)
 * 
 * Средние (48-72 часа):
 * - finance (Взносы и оплата) -> 48 часов (2 дня, финансовые вопросы)
 * - insufficient_data (Недостаточно данных) -> 24 часа (1 день, требует быстрого ответа)
 * 
 * Стандартные (72 часа):
 * - documents (Документы) -> 72 часа (3 дня, документооборот)
 * - membership (Членство) -> 72 часа (3 дня, административные вопросы)
 * - general (Общее) -> 72 часа (3 дня, общие вопросы)
 * 
 * Дефолт для неизвестных типов: 72 часа
 */
export const DEFAULT_SLA_CONFIG_BY_TYPE: SlaConfigByType = {
  // Срочные (12-24 часа)
  access: 12, // Доступ/код - критично, блокирует доступ
  electricity: 24, // Электроэнергия - влияет на комфорт
  
  // Средние (24-48 часов)
  insufficient_data: 24, // Недостаточно данных - требует быстрого ответа
  finance: 48, // Взносы и оплата - финансовые вопросы
  
  // Стандартные (72 часа)
  documents: 72, // Документы - документооборот
  membership: 72, // Членство - административные вопросы
  general: 72, // Общее - общие вопросы
};

/**
 * Дефолтный срок для неизвестных типов обращений (в часах)
 */
export const DEFAULT_SLA_HOURS = 72;

/**
 * Порог для "скоро срок" (в часах до dueAt)
 * Если до срока осталось меньше этого времени, обращение считается "dueSoon"
 * @deprecated Используется 48 часов для dueSoon в SLA v1
 */
export const DUE_SOON_THRESHOLD_HOURS = 24;

/**
 * Вычисляет dueAt на основе типа обращения и SLA конфигурации
 * 
 * @param type - тип обращения (категория из triage)
 * @param config - конфигурация SLA (по умолчанию DEFAULT_SLA_CONFIG_BY_TYPE)
 * @returns ISO строка с датой и временем dueAt
 */
export function calculateDueAtByType(
  type: AppealCategory,
  config: SlaConfigByType = DEFAULT_SLA_CONFIG_BY_TYPE
): string {
  const hours = config[type] ?? DEFAULT_SLA_HOURS;
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + hours);
  return dueDate.toISOString();
}

/**
 * Вычисляет dueAt на основе текущего статуса и SLA конфигурации
 * (legacy функция для обратной совместимости)
 * 
 * @deprecated Используйте calculateDueAtByType для новых обращений
 */
export function calculateDueAt(status: AppealStatus): string {
  // Для обратной совместимости используем старую логику
  const hours = status === "in_progress" ? 72 : status === "needs_info" ? 48 : 24;
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + hours);
  return dueDate.toISOString();
}

/**
 * Проверяет, просрочено ли обращение
 * 
 * @param dueAt - срок выполнения (ISO строка или null)
 * @param status - статус обращения (закрытые не считаются просроченными)
 * @returns true если просрочено, false иначе
 */
export function isOverdue(dueAt: string | null | undefined, status?: AppealStatus): boolean {
  if (!dueAt || status === "closed") {
    return false;
  }
  const dueDate = new Date(dueAt);
  const now = new Date();
  return dueDate < now;
}

/**
 * Проверяет, скоро ли срок выполнения (в ближайшие 48 часов)
 * 
 * @param dueAt - срок выполнения (ISO строка или null)
 * @param status - статус обращения (закрытые не считаются)
 * @returns true если скоро срок (в ближайшие 48 часов), false иначе
 */
export function isDueSoon(dueAt: string | null | undefined, status?: AppealStatus): boolean {
  if (!dueAt || status === "closed") {
    return false;
  }
  const dueDate = new Date(dueAt);
  const now = new Date();
  
  // Если уже просрочено, не считаем "скоро срок"
  if (dueDate < now) {
    return false;
  }
  
  // Проверяем, осталось ли меньше 48 часов (вместо DUE_SOON_THRESHOLD_HOURS = 24)
  const threshold = new Date(now);
  threshold.setHours(threshold.getHours() + 48); // <=48ч для dueSoon
  return dueDate <= threshold;
}

/**
 * Получить SLA конфигурацию по типам обращений
 * Можно расширить через env переменные или внешний конфиг
 */
export function getSlaConfigByType(): SlaConfigByType {
  // В будущем можно добавить загрузку из env или внешнего конфига
  // Например: process.env.SLA_FINANCE_HOURS, process.env.SLA_ACCESS_HOURS и т.д.
  return DEFAULT_SLA_CONFIG_BY_TYPE;
}
