import "server-only";

import { logActivity } from "@/lib/activityLog.store";
import type { Appeal } from "@/lib/office/types";
import type { TriageEvaluationResult } from "./evaluateTriage";
import type { TriageRuleAction } from "@/config/triageRules";

/**
 * Вычисляет diff изменений между обращением до и после применения триажа
 */
function calculateChanges(
  appealBefore: Appeal,
  actions: TriageRuleAction,
  appealAfter?: Appeal
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  // Изменения assigneeRole
  if (actions.assignRole) {
    const beforeRole = appealBefore.assigneeRole ?? null;
    const afterRole = appealAfter?.assigneeRole ?? actions.assignRole;
    if (beforeRole !== afterRole) {
      changes.assigneeRole = {
        before: beforeRole,
        after: afterRole,
      };
    }
  }

  // Изменения status
  if (actions.setStatus) {
    const beforeStatus = appealBefore.status;
    const afterStatus = appealAfter?.status ?? actions.setStatus;
    if (beforeStatus !== afterStatus) {
      changes.status = {
        before: beforeStatus,
        after: afterStatus,
      };
    }
  }

  // Изменения dueAt
  if (actions.setDueAtRule !== undefined) {
    const beforeDueAt = appealBefore.dueAt ?? null;
    const afterDueAt = appealAfter?.dueAt ?? null;
    if (beforeDueAt !== afterDueAt) {
      changes.dueAt = {
        before: beforeDueAt,
        after: afterDueAt,
      };
    }
    const beforeDueAtSource = appealBefore.dueAtSource ?? null;
    const afterDueAtSource = appealAfter?.dueAtSource ?? "auto";
    if (beforeDueAtSource !== afterDueAtSource) {
      changes.dueAtSource = {
        before: beforeDueAtSource,
        after: afterDueAtSource,
      };
    }
  }

  // Изменения tags/labels (если есть)
  if (actions.addTag) {
    changes.tags = {
      added: [actions.addTag],
    };
  }

  return changes;
}

/**
 * Логирует событие triage.matched - когда правило триажа совпало
 */
export function logTriageMatched(
  appeal: Appeal,
  result: TriageEvaluationResult
): void {
  if (!result.matchedRuleId) {
    return; // Не логируем, если правило не найдено
  }

  logActivity({
    actorUserId: null,
    actorRole: "system",
    entityType: "appeal",
    entityId: appeal.id,
    action: "triage.matched",
    meta: {
      ruleId: result.matchedRuleId,
      explanation: result.explanation,
      actions: result.actions,
      appealId: appeal.id,
    },
  });
}

/**
 * Логирует событие triage.applied - когда правило триажа применено к обращению
 */
export function logTriageApplied(
  appealBefore: Appeal,
  result: TriageEvaluationResult,
  appealAfter: Appeal
): void {
  if (!result.matchedRuleId) {
    return; // Не логируем, если правило не найдено
  }

  const changes = calculateChanges(appealBefore, result.actions, appealAfter);

  logActivity({
    actorUserId: null,
    actorRole: "system",
    entityType: "appeal",
    entityId: appealBefore.id,
    action: "triage.applied",
    meta: {
      ruleId: result.matchedRuleId,
      explanation: result.explanation,
      actions: result.actions,
      changes,
      appealId: appealBefore.id,
    },
  });
}

/**
 * Логирует событие triage.skipped - когда триаж пропущен (действий 0)
 */
export function logTriageSkipped(
  appeal: Appeal,
  result: TriageEvaluationResult,
  reason?: string
): void {
  // Всегда логируем skipped, даже если действий нет
  logActivity({
    actorUserId: null,
    actorRole: "system",
    entityType: "appeal",
    entityId: appeal.id,
    action: "triage.skipped",
    meta: {
      ruleId: result.matchedRuleId ?? null,
      explanation: result.explanation,
      actions: result.actions,
      reason: reason || "no_actions",
      appealId: appeal.id,
    },
  });
}
