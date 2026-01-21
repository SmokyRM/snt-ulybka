import "server-only";

import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import { getAllActivityLogs, getActivityLog } from "@/lib/activityLog.store";
import type { ActivityLogEntry } from "@/lib/activityLog.store";

export type ActivityItem = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  actorRole: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export async function listByEntity(
  entityType: string,
  entityId: string,
  options?: { limit?: number }
): Promise<ActivityItem[]> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }

  // Проверяем права в зависимости от типа сущности
  if (entityType === "plot") {
    assertCan(role, "registry.view", undefined);
  } else if (entityType === "appeal") {
    assertCan(role, "appeal.read", "appeal");
  } else {
    // Для других типов требуем базовый доступ к office
    assertCan(role, "office.view", undefined);
  }

  const logs = getActivityLog(entityType, entityId);
  const limit = options?.limit ?? 50;

  return logs.slice(0, limit).map((log) => ({
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    actorUserId: log.actorUserId,
    actorRole: log.actorRole,
    meta: log.meta,
    createdAt: log.createdAt,
  }));
}

export async function listByPlotWithRelated(plotId: string): Promise<ActivityItem[]> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "registry.view", undefined);

  // Получаем участок для поиска связанных сущностей
  const plot = await import("@/server/services/plots").then((m) => m.getPlot(plotId));
  if (!plot) {
    return [];
  }

  // Получаем все логи для участка
  const plotLogs = getActivityLog("plot", plotId);

  // Получаем обращения, связанные с участком
  const appeals = await import("@/server/services/appeals").then((m) => m.listByPlotId(plotId));
  const appealIds = appeals.map((a) => a.id);

  // Получаем логи для связанных обращений
  const appealLogs: ActivityLogEntry[] = [];
  for (const appealId of appealIds) {
    const logs = getActivityLog("appeal", appealId);
    appealLogs.push(...logs);
  }

  // Объединяем и сортируем
  const allLogs = [...plotLogs, ...appealLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return allLogs.slice(0, 50).map((log) => ({
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    actorUserId: log.actorUserId,
    actorRole: log.actorRole,
    meta: log.meta,
    createdAt: log.createdAt,
  }));
}
