import "server-only";

import { getDb, createId } from "@/lib/mockDb";
import type { Role } from "@/lib/permissions";

/**
 * Sprint 7.1: Внутренние уведомления для office roles
 */

export type InternalNotificationType =
  | "appeal.assigned"
  | "appeal.reassigned"
  | "appeal.template_applied"
  | "appeal.overdue";

export type InternalNotification = {
  id: string;
  type: InternalNotificationType;
  title: string;
  message: string;
  targetUserId: string | null; // null если для роли
  targetRole: Role | null; // null если для пользователя
  appealId: string | null;
  meta?: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

/**
 * In-memory store для внутренних уведомлений
 * В будущем можно вынести в БД
 */
const internalNotifications: InternalNotification[] = [];

/**
 * Создать внутреннее уведомление
 */
export function createNotification(params: {
  type: InternalNotificationType;
  title: string;
  message: string;
  targetUserId?: string | null;
  targetRole?: Role | null;
  appealId?: string | null;
  meta?: Record<string, unknown> | null;
}): InternalNotification {
  const now = new Date().toISOString();

  const notification: InternalNotification = {
    id: createId("notif"),
    type: params.type,
    title: params.title,
    message: params.message,
    targetUserId: params.targetUserId ?? null,
    targetRole: params.targetRole ?? null,
    appealId: params.appealId ?? null,
    meta: params.meta ?? null,
    readAt: null,
    createdAt: now,
  };

  internalNotifications.push(notification);
  return notification;
}

/**
 * Получить уведомления для пользователя или роли
 * Фильтрует по targetUserId (если указан) или targetRole (если указан)
 */
export function listNotifications(params: {
  userId?: string | null;
  role?: Role | null;
  unreadOnly?: boolean;
  limit?: number;
}): InternalNotification[] {
  const { userId, role, unreadOnly = false, limit } = params;

  let filtered = [...internalNotifications];

  // Фильтр по пользователю или роли
  if (userId) {
    filtered = filtered.filter(
      (n) => n.targetUserId === userId || (n.targetRole === role && n.targetUserId === null)
    );
  } else if (role) {
    filtered = filtered.filter((n) => n.targetRole === role && n.targetUserId === null);
  }

  // Фильтр по непрочитанным
  if (unreadOnly) {
    filtered = filtered.filter((n) => n.readAt === null);
  }

  // Сортировка: сначала непрочитанные, затем по дате создания (новые сверху)
  filtered.sort((a, b) => {
    if (a.readAt === null && b.readAt !== null) return -1;
    if (a.readAt !== null && b.readAt === null) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Лимит
  if (limit) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Отметить уведомление как прочитанное
 */
export function markRead(id: string, userId: string): InternalNotification | null {
  const index = internalNotifications.findIndex((n) => n.id === id);
  if (index === -1) return null;

  const notification = internalNotifications[index];

  // Проверяем, что уведомление предназначено для этого пользователя
  if (notification.targetUserId && notification.targetUserId !== userId) {
    return null; // Нельзя отмечать чужие уведомления
  }

  // Если уже прочитано, возвращаем как есть
  if (notification.readAt) {
    return notification;
  }

  const updated: InternalNotification = {
    ...notification,
    readAt: new Date().toISOString(),
  };

  internalNotifications[index] = updated;
  return updated;
}

/**
 * Получить количество непрочитанных уведомлений
 */
export function getUnreadCount(params: { userId?: string | null; role?: Role | null }): number {
  return listNotifications({ ...params, unreadOnly: true }).length;
}
