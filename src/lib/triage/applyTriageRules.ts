import "server-only";

import type { Appeal, AppealCategory, AppealStatus } from "@/lib/office/types";
import type { TriageRule, TriageRuleCondition, TriageRuleAction } from "@/config/triageRules";
import { TRIAGE_RULES } from "@/config/triageRules";
import { calculateDueAtByType } from "@/lib/appealsSla";

/**
 * Контекст для применения правил триажа
 */
export type TriageContext = {
  /** Канал обращения (из последнего сообщения или по умолчанию "site") */
  channel?: "none" | "site" | "email" | "telegram";
  /** Есть ли долг у автора обращения */
  hasDebt?: boolean;
  /** Сумма долга автора (в рублях) */
  debtAmount?: number;
};

/**
 * Детали применённого правила
 */
export type AppliedRule = {
  /** ID применённого правила */
  id: string;
  /** Название применённого правила */
  title: string;
  /** Что изменилось в обращении */
  whatChanged: {
    assignRole?: "chairman" | "secretary" | "accountant" | "admin";
    status?: AppealStatus;
    dueAt?: string;
    dueAtSource?: "auto" | "manual";
  };
};

/**
 * Результат применения правил триажа
 */
export type TriageResult = {
  /** Обновлённое обращение */
  updatedAppeal: Appeal;
  /** Список применённых правил с деталями */
  appliedRules: AppliedRule[];
};

/**
 * Проверяет, соответствует ли обращение условию правила
 */
function matchesCondition(
  appeal: Appeal,
  condition: TriageRuleCondition,
  context: TriageContext
): boolean {
  // Проверка типа
  if (condition.type !== undefined && appeal.type !== condition.type) {
    return false;
  }

  // Проверка приоритета
  if (condition.priority !== undefined && appeal.priority !== condition.priority) {
    return false;
  }

  // Проверка ключевых слов
  if (condition.keywords && condition.keywords.length > 0) {
    const text = `${appeal.title} ${appeal.body}`.toLowerCase();
    const hasKeyword = condition.keywords.some((keyword) =>
      text.includes(keyword.toLowerCase())
    );
    if (!hasKeyword) {
      return false;
    }
  }

  // Проверка канала
  if (condition.channel !== undefined) {
    const appealChannel = context.channel ?? "site";
    if (appealChannel !== condition.channel) {
      return false;
    }
  }

  // Проверка наличия долга
  if (condition.hasDebt !== undefined) {
    const hasDebt = context.hasDebt ?? false;
    if (hasDebt !== condition.hasDebt) {
      return false;
    }
  }

  // Проверка суммы долга
  if (condition.amountGt !== undefined) {
    const debtAmount = context.debtAmount ?? 0;
    if (debtAmount <= condition.amountGt) {
      return false;
    }
  }

  return true;
}

/**
 * Применяет действие правила к обращению
 * Возвращает изменения, которые нужно применить
 */
function applyAction(
  appeal: Appeal,
  action: TriageRuleAction
): {
  assignRole?: "chairman" | "secretary" | "accountant" | "admin";
  status?: AppealStatus;
  dueAt?: string;
  dueAtSource?: "auto" | "manual";
} {
  const changes: {
    assignRole?: "chairman" | "secretary" | "accountant" | "admin";
    status?: AppealStatus;
    dueAt?: string;
    dueAtSource?: "auto" | "manual";
  } = {};

  // Назначение роли (только если еще не назначено вручную)
  if (action.assignRole && !appeal.assignedToUserId) {
    changes.assignRole = action.assignRole;
  }

  // Установка статуса (только если статус ещё "new")
  if (action.setStatus && appeal.status === "new") {
    changes.status = action.setStatus;
  }

  // Установка dueAt (только если dueAtSource="auto" или dueAt не установлен)
  if (action.setDueAtRule !== undefined) {
    // Меняем только если dueAtSource="auto" или dueAt не установлен
    if (appeal.dueAtSource === "auto" || !appeal.dueAt) {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + action.setDueAtRule);
      changes.dueAt = dueDate.toISOString();
      changes.dueAtSource = "auto";
    }
  } else if (action.assignRole || action.setStatus) {
    // Если изменили роль или статус, но не указали setDueAtRule, пересчитываем по SLA
    if (appeal.type && (appeal.dueAtSource === "auto" || !appeal.dueAt)) {
      changes.dueAt = calculateDueAtByType(appeal.type);
      changes.dueAtSource = "auto";
    }
  }

  return changes;
}

/**
 * Применяет правила триажа к обращению
 * 
 * Правила:
 * - Применяются по порядку (order)
 * - Первое совпадение выполняется
 * - Не перетирают ручные изменения:
 *   - assignment: если assignedToUserId уже есть (ручное) — не менять
 *   - dueAt: менять только если dueAtSource="auto" или dueAt не установлен
 *   - статус: менять только если статус ещё "new"
 * 
 * @param appeal - обращение для триажа
 * @param context - контекст (канал, долг и т.д.)
 * @returns обновлённое обращение и список применённых правил
 */
export function applyTriageRules(
  appeal: Appeal,
  context: TriageContext = {}
): TriageResult {
  // Создаём копию обращения для изменений
  let updatedAppeal: Appeal = { ...appeal };
  const appliedRules: AppliedRule[] = [];

  // Сортируем правила по order (меньше = раньше)
  const sortedRules: TriageRule[] = [...TRIAGE_RULES]
    .filter((rule) => rule.enabled !== false)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

  // Применяем правила по порядку, первое совпадение выполняется
  for (const rule of sortedRules) {
    if (matchesCondition(updatedAppeal, rule.when, context)) {
      // Применяем действие правила
      const changes = applyAction(updatedAppeal, rule.then);

      // Если есть изменения, применяем их
      if (Object.keys(changes).length > 0) {
        // Применяем изменения к обращению
        if (changes.assignRole) {
          // Для assignRole нужно найти userId по роли (это будет сделано позже в сервисе)
          // Здесь мы только сохраняем роль для последующего назначения
          updatedAppeal = {
            ...updatedAppeal,
            assigneeRole: changes.assignRole,
          };
        }

        if (changes.status) {
          updatedAppeal = {
            ...updatedAppeal,
            status: changes.status,
          };
        }

        if (changes.dueAt) {
          updatedAppeal = {
            ...updatedAppeal,
            dueAt: changes.dueAt,
            dueAtSource: changes.dueAtSource ?? "auto",
          };
        }

        // Сохраняем информацию о применённом правиле
        appliedRules.push({
          id: rule.id,
          title: rule.title,
          whatChanged: changes,
        });

        // Первое совпадение применяется, остальные пропускаем
        break;
      }
    }
  }

  return {
    updatedAppeal,
    appliedRules,
  };
}
