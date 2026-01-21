import "server-only";
import { logActivity } from "./activityLog.store";
import type { ActivityLogEntry } from "./activityLog.store";

/**
 * Типы действий для ActivityLog обращений
 */
export type AppealActivityAction =
  | "created"
  | "status_changed"
  | "assigned"
  | "unassigned"
  | "reassigned"
  | "comment_added"
  | "system_rule_applied";

/**
 * Метаданные для различных действий
 */
export type AppealActivityMeta = {
  // created
  title?: string;
  plotNumber?: string;
  authorName?: string;
  
  // status_changed
  oldStatus?: string;
  newStatus?: string;
  comment?: string | null;
  
  // assigned/unassigned/reassigned
  from?: string | null;
  fromRole?: string | null;
  to?: string | null;
  toRole?: string | null;
  
  // comment_added
  commentId?: string;
  text?: string;
  
  // system_rule_applied
  ruleName?: string;
  changes?: Record<string, unknown>;
  
  // Общие поля
  [key: string]: unknown;
};

/**
 * Добавляет запись в ActivityLog для обращения
 * Транзакционно логирует события вместе с действиями
 */
export function appendActivityLog(params: {
  appealId: string;
  action: AppealActivityAction;
  actorUserId?: string | null;
  actorRole?: string | null;
  meta?: AppealActivityMeta | null;
}): ActivityLogEntry {
  return logActivity({
    actorUserId: params.actorUserId ?? null,
    actorRole: params.actorRole ?? null,
    entityType: "appeal",
    entityId: params.appealId,
    action: params.action,
    meta: params.meta ?? null,
  });
}
