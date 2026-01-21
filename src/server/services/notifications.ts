import "server-only";

import { getDb, findUserById, upsertUserById } from "@/lib/mockDb";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
import { logActivity } from "@/lib/activityLog.store";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import type { AppealCategory } from "@/lib/office/types";

export type NotificationEventType = "appeal.created" | "appeal.assigned" | "appeal.overdue";

export type NotificationEvent = {
  type: NotificationEventType;
  payload: Record<string, unknown>;
  timestamp: string;
};

export type UserNotificationPrefs = {
  userId: string;
  enabled: boolean;
  telegramChatId?: string | null;
  events: {
    appealCreated?: boolean;
    appealAssigned?: boolean;
    appealOverdue?: boolean;
  };
  updatedAt: string;
};

// Хранилище настроек уведомлений (в памяти, можно вынести в БД)
const notificationPrefsStore = new Map<string, UserNotificationPrefs>();

/**
 * Получить настройки уведомлений пользователя
 * Использует telegramChatId из User, если есть
 */
export function getUserNotificationPrefs(userId: string): UserNotificationPrefs | null {
  const user = findUserById(userId);
  if (!user) return null;

  const existing = notificationPrefsStore.get(userId);
  const telegramChatId = user.telegramChatId || existing?.telegramChatId || null;

  if (existing) {
    // Обновляем telegramChatId из User, если он изменился
    if (user.telegramChatId && existing.telegramChatId !== user.telegramChatId) {
      const updated = { ...existing, telegramChatId: user.telegramChatId };
      notificationPrefsStore.set(userId, updated);
      return updated;
    }
    return existing;
  }

  // Дефолтные настройки
  const defaultPrefs: UserNotificationPrefs = {
    userId,
    enabled: false,
    telegramChatId,
    events: {
      appealCreated: true,
      appealAssigned: true,
      appealOverdue: true,
    },
    updatedAt: new Date().toISOString(),
  };

  notificationPrefsStore.set(userId, defaultPrefs);
  return defaultPrefs;
}

/**
 * Сохранить настройки уведомлений пользователя
 * Sprint 5.1: Также обновляет telegramChatId в User модели
 */
export function setUserNotificationPrefs(userId: string, prefs: Partial<UserNotificationPrefs>): UserNotificationPrefs {
  const user = findUserById(userId);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const existing = getUserNotificationPrefs(userId) ?? {
    userId,
    enabled: false,
    telegramChatId: user.telegramChatId || null,
    events: {
      appealCreated: true,
      appealAssigned: true,
      appealOverdue: true,
    },
    updatedAt: new Date().toISOString(),
  };

  const updated: UserNotificationPrefs = {
    ...existing,
    ...prefs,
    userId,
    updatedAt: new Date().toISOString(),
  };

  // Sprint 5.1: Синхронизируем telegramChatId с User моделью
  if (prefs.telegramChatId !== undefined) {
    upsertUserById({
      id: userId,
      telegramChatId: prefs.telegramChatId,
    });
  }

  notificationPrefsStore.set(userId, updated);
  return updated;
}

/**
 * Определяет кому отправлять уведомление при создании обращения
 * Правила:
 * - finance -> accountant, admin
 * - electricity -> secretary, admin
 * - access -> secretary, admin (срочно)
 * - documents -> secretary, admin
 * - membership -> chairman, admin
 * - insufficient_data -> secretary, admin
 * - general -> secretary, admin, chairman
 */
function getRecipientsForNewAppeal(appealType?: AppealCategory): Role[] {
  if (!appealType) {
    // Если тип не определен, отправляем всем staff
    return ["admin", "chairman", "secretary"];
  }

  switch (appealType) {
    case "finance":
      return ["accountant", "admin"];
    case "electricity":
      return ["secretary", "admin"];
    case "access":
      return ["secretary", "admin"]; // Срочно
    case "documents":
      return ["secretary", "admin"];
    case "membership":
      return ["chairman", "admin"];
    case "insufficient_data":
      return ["secretary", "admin"];
    case "general":
    default:
      return ["secretary", "admin", "chairman"];
  }
}

/**
 * Отправить уведомление о событии
 * Логирует отправку в ActivityLog
 */
export async function sendEvent(
  eventType: NotificationEventType,
  payload: Record<string, unknown>,
  options?: { targetUserId?: string; targetRoles?: Role[] }
): Promise<{ sent: number; failed: number }> {
  const db = getDb();
  const event: NotificationEvent = {
    type: eventType,
    payload,
    timestamp: new Date().toISOString(),
  };

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    // В dev режиме просто логируем
    if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
      console.log("[notifications] TELEGRAM_BOT_TOKEN not configured, skipping", { eventType });
    }
    return { sent: 0, failed: 0 };
  }

  // Определяем получателей
  let targetUsers: typeof db.users = [];
  
  if (options?.targetUserId) {
    // Отправляем конкретному пользователю
    const user = findUserById(options.targetUserId);
    if (user) {
      targetUsers = [user];
    }
  } else if (options?.targetRoles) {
    // Отправляем пользователям с указанными ролями
    targetUsers = db.users.filter((u) => options.targetRoles!.includes(u.role as Role));
  } else {
    // Определяем получателей по типу события
    if (eventType === "appeal.created") {
      const appealType = payload.type as AppealCategory | undefined;
      const targetRoles = getRecipientsForNewAppeal(appealType);
      targetUsers = db.users.filter((u) => targetRoles.includes(u.role as Role));
    } else if (eventType === "appeal.assigned") {
      // При назначении отправляем только назначенному пользователю
      const assignedUserId = payload.assignedTo as string | undefined;
      if (assignedUserId) {
        const user = findUserById(assignedUserId);
        if (user) {
          targetUsers = [user];
        }
      }
    } else if (eventType === "appeal.overdue") {
      // При overdue отправляем назначенному пользователю или всем staff
      const assignedUserId = payload.assignedTo as string | undefined;
      if (assignedUserId) {
        const user = findUserById(assignedUserId);
        if (user) {
          targetUsers = [user];
        }
      } else {
        // Если не назначено, отправляем всем staff
        targetUsers = db.users.filter((u) => isStaffOrAdmin(u.role as Role));
      }
    }
  }

  // Фильтруем пользователей с включенными уведомлениями
  const recipients = targetUsers.filter((u) => {
    const prefs = getUserNotificationPrefs(u.id);
    if (!prefs || !prefs.enabled) return false;
    if (!prefs.telegramChatId) return false;

    // Проверяем подписку на конкретное событие
    if (eventType === "appeal.created" && !prefs.events.appealCreated) return false;
    if (eventType === "appeal.assigned" && !prefs.events.appealAssigned) return false;
    if (eventType === "appeal.overdue" && !prefs.events.appealOverdue) return false;

    return true;
  });

  // Форматируем сообщение
  const message = formatEventMessage(eventType, payload);

  let sent = 0;
  let failed = 0;

  // Отправляем уведомления всем подписанным пользователям
  for (const user of recipients) {
    const prefs = getUserNotificationPrefs(user.id);
    if (!prefs?.telegramChatId) continue;

    try {
      const result = await sendTelegramMessage(prefs.telegramChatId, message);
      
      // Если отправка не удалась (токен не настроен), пропускаем
      if (!result) {
        continue;
      }

      // Логируем успешную отправку в ActivityLog
      await logActivity({
        actorUserId: null, // Системное действие
        actorRole: null,
        entityType: "notification",
        entityId: `${eventType}_${payload.appealId || payload.id || Date.now()}`,
        action: "notification_sent",
        meta: {
          eventType,
          recipientUserId: user.id,
          recipientRole: user.role,
          telegramChatId: prefs.telegramChatId,
          providerMessageId: result.providerMessageId,
          success: result.success,
        },
      });

      sent++;
    } catch (error) {
      failed++;
      
      // Логируем неудачную отправку в ActivityLog
      await logActivity({
        actorUserId: null,
        actorRole: null,
        entityType: "notification",
        entityId: `${eventType}_${payload.appealId || payload.id || Date.now()}`,
        action: "notification_sent",
        meta: {
          eventType,
          recipientUserId: user.id,
          recipientRole: user.role,
          telegramChatId: prefs.telegramChatId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      // Логируем ошибку, но не прерываем отправку другим пользователям
      console.error(`[notifications] Failed to send to user ${user.id}:`, error);
    }
  }

  return { sent, failed };
}

/**
 * Форматирует сообщение для Telegram в зависимости от типа события
 */
function formatEventMessage(eventType: NotificationEventType, payload: Record<string, unknown>): string {
  switch (eventType) {
    case "appeal.created": {
      const title = String(payload.title ?? "Новое обращение");
      const plotNumber = payload.plotNumber ? String(payload.plotNumber) : null;
      const authorName = payload.authorName ? String(payload.authorName) : null;
      const appealId = payload.appealId || payload.id ? String(payload.appealId || payload.id) : null;
      const type = payload.type ? String(payload.type) : null;
      
      let message = `🔔 <b>Новое обращение</b>\n\n${title}`;
      if (type) {
        message += `\nТип: ${type}`;
      }
      if (plotNumber) {
        message += `\nУчасток: ${plotNumber}`;
      }
      if (authorName) {
        message += `\nАвтор: ${authorName}`;
      }
      if (appealId) {
        message += `\n\n<a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/office/appeals/${appealId}">Открыть обращение</a>`;
      }
      return message;
    }
    case "appeal.assigned": {
      const title = String(payload.title ?? "Обращение");
      const appealId = payload.appealId ? String(payload.appealId) : null;
      const assignedTo = payload.assignedTo ? String(payload.assignedTo) : null;
      
      let message = `📌 <b>Обращение назначено на вас</b>\n\n${title}`;
      if (appealId) {
        message += `\n\n<a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/office/appeals/${appealId}">Открыть обращение</a>`;
      }
      return message;
    }
    case "appeal.overdue": {
      const title = String(payload.title ?? "Обращение");
      const appealId = payload.appealId ? String(payload.appealId) : null;
      const dueAt = payload.dueAt ? new Date(String(payload.dueAt)).toLocaleDateString("ru-RU") : null;
      const plotNumber = payload.plotNumber ? String(payload.plotNumber) : null;
      
      let message = `⚠️ <b>Просрочено обращение</b>\n\n${title}`;
      if (plotNumber) {
        message += `\nУчасток: ${plotNumber}`;
      }
      if (dueAt) {
        message += `\nСрок: ${dueAt}`;
      }
      if (appealId) {
        message += `\n\n<a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/office/appeals/${appealId}">Открыть обращение</a>`;
      }
      return message;
    }
    default:
      return `Уведомление: ${eventType}`;
  }
}

/**
 * Отправить ежедневный дайджест для роли
 */
export async function sendDailyDigest(role: Role): Promise<{ sent: number; failed: number }> {
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }

  const db = getDb();
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
      console.log("[notifications] TELEGRAM_BOT_TOKEN not configured, skipping digest");
    }
    return { sent: 0, failed: 0 };
  }

  // Импортируем функции дайджеста
  const { generateDailyDigestData, formatDailyDigest } = await import("./digest");

  // Получаем пользователей с этой ролью и включенными уведомлениями
  const users = db.users.filter((u) => {
    if (u.role !== role) return false;
    const prefs = getUserNotificationPrefs(u.id);
    return prefs?.enabled && prefs.telegramChatId;
  });

  let sent = 0;
  let failed = 0;

  // Отправляем дайджест всем пользователям роли
  for (const user of users) {
    const prefs = getUserNotificationPrefs(user.id);
    if (!prefs?.telegramChatId) continue;

    try {
      // Генерируем данные дайджеста для конкретного пользователя
      const userRole = user.role as Role;
      const digestData = generateDailyDigestData(user.id, userRole);
      const digest = formatDailyDigest(userRole, digestData);

      const result = await sendTelegramMessage(prefs.telegramChatId, digest);
      
      // Если отправка не удалась (токен не настроен), пропускаем
      if (!result) {
        continue;
      }

      // Sprint 5.3: Логируем успешную отправку в ActivityLog
      await logActivity({
        actorUserId: null,
        actorRole: null,
        entityType: "notification",
        entityId: `daily_digest_${role}_${user.id}_${Date.now()}`,
        action: "notification_sent",
        meta: {
          channel: "telegram",
          trigger: "daily_digest",
          toRole: role,
          toUserId: user.id,
          appealId: null, // Для дайджеста нет конкретного обращения
          providerMessageId: result.providerMessageId,
          counts: {
            myOpen: digestData.myOpen,
            overdue: digestData.overdue,
            dueSoon: digestData.dueSoon,
            newToday: digestData.newToday,
          },
        },
      });

      sent++;
    } catch (error) {
      failed++;

      // Sprint 5.3: Логируем неудачную отправку в ActivityLog
      await logActivity({
        actorUserId: null,
        actorRole: null,
        entityType: "notification",
        entityId: `daily_digest_${role}_${user.id}_${Date.now()}`,
        action: "notification_failed",
        meta: {
          channel: "telegram",
          trigger: "daily_digest",
          toRole: role,
          toUserId: user.id,
          appealId: null,
          reason: "send_failed",
          error: error instanceof Error ? error.message : String(error),
        },
      });

      console.error(`[notifications] Failed to send digest to user ${user.id}:`, error);
    }
  }

  return { sent, failed };
}

/**
 * Отправить дайджест для роли (deprecated, используйте sendDailyDigest)
 * @deprecated Используйте sendDailyDigest
 */
export async function sendDigest(role: Role): Promise<void> {
  await sendDailyDigest(role);
}
