import "server-only";

import type { AppealCategory, AppealStatus } from "./office/types";
import type { Appeal } from "./office/types";
import { logActivity } from "./activityLog.store";
import { calculateDueAtByType } from "./appealsSla";

export type RuleCondition = {
  type?: AppealCategory; // Точное совпадение типа
  priority?: "low" | "medium" | "high"; // Точное совпадение приоритета
  keywords?: string[]; // Ключевые слова (хотя бы одно должно быть в тексте)
};

export type RuleAction = {
  assignRole?: "chairman" | "secretary" | "accountant" | "admin";
  setStatus?: AppealStatus;
  setDueAtRule?: number; // Часы для установки dueAt (если не указано, используется SLA по типу)
};

export type AppealRule = {
  id: string; // Уникальный ID правила
  name: string; // Название правила для логирования
  condition: RuleCondition;
  action: RuleAction;
  enabled?: boolean; // Можно отключить правило без удаления
  order?: number; // Порядок применения (меньше = раньше)
};

/**
 * Конфигурация правил авто-триажа
 * Правила применяются по порядку (order), первое совпадение выполняется
 */
export const APPEAL_RULES: AppealRule[] = [
  {
    id: "rule_high_priority_access",
    name: "Высокий приоритет: доступ",
    condition: {
      type: "access",
      priority: "high",
    },
    action: {
      assignRole: "secretary",
      setStatus: "in_progress",
      setDueAtRule: 6, // 6 часов для срочных вопросов доступа
    },
    enabled: true,
    order: 1,
  },
  {
    id: "rule_finance_accountant",
    name: "Финансы -> бухгалтер",
    condition: {
      type: "finance",
    },
    action: {
      assignRole: "accountant",
    },
    enabled: true,
    order: 2,
  },
  {
    id: "rule_electricity_accountant",
    name: "Электроэнергия -> бухгалтер",
    condition: {
      type: "electricity",
    },
    action: {
      assignRole: "accountant",
    },
    enabled: true,
    order: 3,
  },
  {
    id: "rule_membership_chairman",
    name: "Членство -> председатель",
    condition: {
      type: "membership",
    },
    action: {
      assignRole: "chairman",
    },
    enabled: true,
    order: 4,
  },
  {
    id: "rule_insufficient_data_status",
    name: "Недостаточно данных -> needs_info",
    condition: {
      type: "insufficient_data",
    },
    action: {
      setStatus: "needs_info",
    },
    enabled: true,
    order: 5,
  },
  {
    id: "rule_urgent_keywords",
    name: "Срочные ключевые слова -> высокий приоритет",
    condition: {
      keywords: ["срочно", "срочно!", "urgent", "критично", "авария", "не работает"],
    },
    action: {
      setStatus: "in_progress",
      setDueAtRule: 12, // 12 часов для срочных
    },
    enabled: true,
    order: 6,
  },
  {
    id: "rule_high_priority_fast",
    name: "Высокий приоритет -> быстрый срок",
    condition: {
      priority: "high",
    },
    action: {
      setDueAtRule: 24, // 24 часа для высокого приоритета
    },
    enabled: true,
    order: 7,
  },
];

/**
 * Проверяет, соответствует ли обращение условию правила
 */
function matchesCondition(appeal: Appeal, condition: RuleCondition): boolean {
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

  return true;
}

/**
 * Применяет действие правила к обращению
 * Возвращает объект с изменениями (для применения к appeal)
 * 
 * ВАЖНО: Эта функция только возвращает изменения, не применяет их напрямую к appeal
 */
function applyAction(
  appeal: Appeal,
  action: RuleAction,
  ruleId: string
): {
  assigneeRole?: "chairman" | "secretary" | "accountant" | "admin";
  status?: AppealStatus;
  dueAt?: string;
  dueAtSource?: "auto" | "manual";
} {
  const changes: {
    assigneeRole?: "chairman" | "secretary" | "accountant" | "admin";
    status?: AppealStatus;
    dueAt?: string;
    dueAtSource?: "auto" | "manual";
  } = {};

  // Назначение роли (только если еще не назначено вручную)
  if (action.assignRole && !appeal.assigneeUserId) {
    // Можно перезаписать автоматическое назначение, но не ручное
    changes.assigneeRole = action.assignRole;
  }

  // Установка статуса
  if (action.setStatus) {
    changes.status = action.setStatus;
  }

  // Установка dueAt
  if (action.setDueAtRule !== undefined) {
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + action.setDueAtRule);
    changes.dueAt = dueDate.toISOString();
    changes.dueAtSource = "auto";
  } else if (action.assignRole || action.setStatus) {
    // Если изменили роль или статус, но не указали dueAtRule, пересчитываем по SLA
    if (appeal.type) {
      changes.dueAt = calculateDueAtByType(appeal.type);
      changes.dueAtSource = "auto";
    }
  }

  return changes;
}

/**
 * Применяет правила к обращению
 * Возвращает изменения, которые нужно применить к обращению
 * 
 * @param appeal - обращение для проверки
 * @param options - опции применения правил
 * @param options.skipManualAssignments - не перезаписывать ручные назначения (по умолчанию true)
 * @returns объект с изменениями и ID примененного правила
 */
export function evaluateRules(
  appeal: Appeal,
  options?: { skipManualAssignments?: boolean }
): {
  changes: {
    assigneeRole?: "chairman" | "secretary" | "accountant" | "admin";
    status?: AppealStatus;
    dueAt?: string;
    dueAtSource?: "auto" | "manual";
  };
  appliedRuleId?: string;
} {
  const skipManual = options?.skipManualAssignments !== false;

  // Сортируем правила по order (меньше = раньше)
  const sortedRules = [...APPEAL_RULES]
    .filter((rule) => rule.enabled !== false)
    .sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000));

  // Проверяем правила по порядку, первое совпадение применяем
  for (const rule of sortedRules) {
    if (matchesCondition(appeal, rule.condition)) {
      const changes = applyAction(appeal, rule.action, rule.id);

      // Если skipManualAssignments=true и есть ручное назначение, не перезаписываем
      if (skipManual && appeal.assigneeUserId && changes.assigneeRole) {
        // Не перезаписываем ручное назначение пользователем
        delete changes.assigneeRole;
      }

      // Если есть изменения, возвращаем их
      if (Object.keys(changes).length > 0) {
        return {
          changes,
          appliedRuleId: rule.id,
        };
      }
    }
  }

  return { changes: {} };
}

/**
 * Применяет правила к обращению и логирует в ActivityLog
 * 
 * @param appeal - обращение
 * @param appealId - ID обращения (для логирования)
 * @param options - опции применения правил
 * @returns изменения для применения к обращению
 */
export function applyRulesWithLogging(
  appeal: Appeal,
  appealId: string,
  options?: { skipManualAssignments?: boolean }
): {
  assigneeRole?: "chairman" | "secretary" | "accountant" | "admin";
  status?: AppealStatus;
  dueAt?: string;
  dueAtSource?: "auto" | "manual";
} {
  const result = evaluateRules(appeal, options);

  // Логируем применение правила
  if (result.appliedRuleId && Object.keys(result.changes).length > 0) {
    const rule = APPEAL_RULES.find((r) => r.id === result.appliedRuleId);
    
    logActivity({
      actorUserId: null, // Системное действие
      actorRole: null,
      entityType: "appeal",
      entityId: appealId,
      action: "rule_applied",
      meta: {
        ruleId: result.appliedRuleId,
        ruleName: rule?.name || result.appliedRuleId,
        changes: result.changes,
      },
    });

    // Логируем отдельные действия для лучшей трассируемости
    if (result.changes.assigneeRole) {
      logActivity({
        actorUserId: null,
        actorRole: null,
        entityType: "appeal",
        entityId: appealId,
        action: "appeal.assigned",
        meta: {
          ruleId: result.appliedRuleId,
          ruleName: rule?.name || result.appliedRuleId,
          assignedRole: result.changes.assigneeRole,
          viaRule: true,
        },
      });
    }

    if (result.changes.status) {
      logActivity({
        actorUserId: null,
        actorRole: null,
        entityType: "appeal",
        entityId: appealId,
        action: "status_changed",
        meta: {
          ruleId: result.appliedRuleId,
          ruleName: rule?.name || result.appliedRuleId,
          oldStatus: appeal.status,
          newStatus: result.changes.status,
          viaRule: true,
        },
      });
    }

    if (result.changes.dueAt) {
      logActivity({
        actorUserId: null,
        actorRole: null,
        entityType: "appeal",
        entityId: appealId,
        action: "due_at_set",
        meta: {
          ruleId: result.appliedRuleId,
          ruleName: rule?.name || result.appliedRuleId,
          dueAt: result.changes.dueAt,
          dueAtSource: result.changes.dueAtSource,
          viaRule: true,
        },
      });
    }
  }

  return result.changes;
}
