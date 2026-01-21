import "server-only";

import type { ActivityLogEntry } from "@/lib/activityLog.store";

export type RuleInfo = {
  ruleId: string;
  ruleName: string;
  action: "assigned" | "status_changed" | "due_at_set" | "rule_applied";
  appliedAt: string;
};

/**
 * Получает информацию о примененных правилах из ActivityLog
 * Возвращает последнее примененное правило для каждого типа действия
 */
export function getAppliedRulesInfo(logs: ActivityLogEntry[]): {
  assignmentRule?: RuleInfo;
  statusRule?: RuleInfo;
  dueAtRule?: RuleInfo;
} {
  const result: {
    assignmentRule?: RuleInfo;
    statusRule?: RuleInfo;
    dueAtRule?: RuleInfo;
  } = {};

  // Ищем записи о применении правил
  for (const log of logs) {
    const meta = log.meta || {};

    // Проверяем, что это действие от правила
    if (meta.viaRule === true || log.action === "rule_applied") {
      const ruleId = meta.ruleId as string | undefined;
      const ruleName = meta.ruleName as string | undefined;

      if (!ruleId || !ruleName) continue;

      const ruleInfo: RuleInfo = {
        ruleId,
        ruleName,
        action: log.action as RuleInfo["action"],
        appliedAt: log.createdAt,
      };

      // Определяем тип действия
      const changes = meta.changes as Record<string, unknown> | undefined;
      
      if (log.action === "appeal.assigned" || (log.action === "rule_applied" && changes && "assigneeRole" in changes)) {
        // Назначение по правилу
        if (!result.assignmentRule || new Date(log.createdAt) > new Date(result.assignmentRule.appliedAt)) {
          result.assignmentRule = ruleInfo;
        }
      } else if (log.action === "status_changed" || (log.action === "rule_applied" && changes && "status" in changes)) {
        // Изменение статуса по правилу
        if (!result.statusRule || new Date(log.createdAt) > new Date(result.statusRule.appliedAt)) {
          result.statusRule = ruleInfo;
        }
      } else if (log.action === "due_at_set" || (log.action === "rule_applied" && changes && "dueAt" in changes)) {
        // Установка срока по правилу
        if (!result.dueAtRule || new Date(log.createdAt) > new Date(result.dueAtRule.appliedAt)) {
          result.dueAtRule = ruleInfo;
        }
      }
    }
  }

  return result;
}
