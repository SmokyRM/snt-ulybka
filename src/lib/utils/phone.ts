/**
 * Sprint 4.4: Утилиты для работы с телефонными номерами
 */

/**
 * Нормализует телефонный номер, оставляя только цифры
 * 
 * @param input - телефонный номер в любом формате (например, "+7 (999) 123-45-67")
 * @returns строка только с цифрами (например, "79991234567")
 * 
 * @example
 * normalizePhone("+7 (999) 123-45-67") // "79991234567"
 * normalizePhone("8 999 123 45 67") // "89991234567"
 * normalizePhone("+79171112233") // "79171112233"
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return "";
  // Удаляем все нецифровые символы
  return input.replace(/\D/g, "");
}
