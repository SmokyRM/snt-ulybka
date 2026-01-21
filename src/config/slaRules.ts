import type { AppealCategory } from "@/lib/office/types";

/**
 * SLA правила v1: map type -> durationHours
 * Определяет сроки выполнения (dueAt) в зависимости от типа обращения
 * Значения в часах
 */
export type SlaRules = {
  [K in AppealCategory]?: number;
};

/**
 * Конфигурация SLA правил по типам обращений:
 * 
 * Срочные (12-24 часа):
 * - access (Доступ/код) -> 12 часов (критично, блокирует доступ)
 * - electricity (Электроэнергия) -> 24 часа (1 день, влияет на комфорт)
 * 
 * Средние (24-48 часов):
 * - insufficient_data (Недостаточно данных) -> 24 часа (1 день, требует быстрого ответа)
 * - finance (Взносы и оплата) -> 48 часов (2 дня, финансовые вопросы)
 * 
 * Стандартные (72 часа):
 * - documents (Документы) -> 72 часа (3 дня, документооборот)
 * - membership (Членство) -> 72 часа (3 дня, административные вопросы)
 * - general (Общее) -> 72 часа (3 дня, общие вопросы)
 * 
 * Дефолт для неизвестных типов: 72 часа
 */
export const SLA_RULES: SlaRules = {
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
 * Вычисляет dueAt на основе типа обращения и SLA правил
 * 
 * @param type - тип обращения (категория из triage)
 * @param rules - конфигурация SLA правил (по умолчанию SLA_RULES)
 * @returns ISO строка с датой и временем dueAt
 */
export function calculateDueAtByType(
  type: AppealCategory,
  rules: SlaRules = SLA_RULES
): string {
  const hours = rules[type] ?? DEFAULT_SLA_HOURS;
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + hours);
  return dueDate.toISOString();
}
