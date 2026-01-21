import "server-only";
import { getDb } from "./mockDb";
import type { ActivityLogEntry } from "./mockDb";

// Re-export для удобства
export type { ActivityLogEntry };

export function logActivity(entry: {
  actorUserId: string | null;
  actorRole: string | null;
  entityType: string;
  entityId: string;
  action: string;
  meta?: Record<string, unknown> | null;
  // Для обратной совместимости
  payload?: Record<string, unknown> | null;
}): ActivityLogEntry {
  const db = getDb();
  const log: ActivityLogEntry = {
    id: createId("activity"),
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    actorUserId: entry.actorUserId ?? null,
    actorRole: entry.actorRole ?? null,
    meta: entry.meta ?? entry.payload ?? null, // Поддержка обоих полей для миграции
    createdAt: new Date().toISOString(),
  };
  db.activityLogs.unshift(log);
  // Ограничиваем размер логов
  if (db.activityLogs.length > 5000) {
    db.activityLogs = db.activityLogs.slice(0, 5000);
  }
  return log;
}

export function getActivityLog(entityType: string, entityId: string): ActivityLogEntry[] {
  const db = getDb();
  return db.activityLogs
    .filter((log) => log.entityType === entityType && log.entityId === entityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAllActivityLogs(entityType?: string): ActivityLogEntry[] {
  const db = getDb();
  let logs = [...db.activityLogs];
  if (entityType) {
    logs = logs.filter((log) => log.entityType === entityType);
  }
  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Используем createId из mockDb
let createIdCounter = 0;
function createId(prefix: string): string {
  createIdCounter += 1;
  return `${prefix}_${Date.now()}_${createIdCounter}_${Math.random().toString(36).slice(2, 9)}`;
}
