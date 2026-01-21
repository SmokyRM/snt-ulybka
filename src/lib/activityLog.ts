import "server-only";
import { logActivity } from "./activityLog.store";
import type { ActivityLogEntry } from "./activityLog.store";

/**
 * Типы действий для ActivityLog
 */
export type ActivityAction =
  | "created"
  | "assigned"
  | "unassigned"
  | "reassigned"
  | "status_changed"
  | "system_rule_applied"
  | "comment_added"
  | "triage.matched"
  | "triage.applied"
  | "triage.skipped"
  | "template.applied";

/**
 * Метаданные для ActivityLog (JSON)
 */
export type ActivityMeta = Record<string, unknown> | null;

/**
 * Helper для добавления записи в ActivityLog
 * Транзакционно логирует события вместе с действиями
 * 
 * @param entityType - тип сущности (например "appeal")
 * @param entityId - ID сущности
 * @param action - действие (created, assigned, unassigned, reassigned, status_changed, system_rule_applied)
 * @param actorUserId - ID пользователя (null для system действий)
 * @param meta - метаданные (JSON, nullable)
 * @returns созданная запись ActivityLog
 */
export function appendActivity(
  entityType: string,
  entityId: string,
  action: ActivityAction | string,
  actorUserId: string | null,
  meta: ActivityMeta = null
): ActivityLogEntry {
  return logActivity({
    actorUserId,
    actorRole: null, // Можно расширить в будущем, если нужно
    entityType,
    entityId,
    action,
    meta,
  });
}
