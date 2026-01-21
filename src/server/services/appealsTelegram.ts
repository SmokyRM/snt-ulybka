import "server-only";

import { sendTelegramMessage } from "@/lib/notifications/telegram";
import { logActivity } from "@/lib/activityLog.store";
import { findUserById } from "@/lib/mockDb";
import { listUsers } from "@/lib/mockDb";
import { overdue } from "@/lib/sla";
import type { Appeal } from "@/lib/office/types";

/**
 * Sprint 5.2: Дедупликация уведомлений (не спамить)
 * Хранит последние отправленные уведомления по ключу eventKey
 */
const notificationDedupe = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60 * 60 * 1000; // 1 час

/**
 * Sprint 5.2: Проверяет, можно ли отправить уведомление (дедупликация)
 */
function canSendNotification(eventKey: string): boolean {
  const lastSent = notificationDedupe.get(eventKey);
  const now = Date.now();
  
  if (lastSent && now - lastSent < DEDUPE_WINDOW_MS) {
    return false; // Уже отправляли недавно
  }
  
  notificationDedupe.set(eventKey, now);
  return true;
}

/**
 * Sprint 5.2: Форматирует краткое сообщение для Telegram
 */
function formatTelegramMessage(appeal: Appeal, trigger: "created" | "assigned" | "overdue"): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const appealUrl = `${baseUrl}/office/appeals/${appeal.id}`;
  
  let prefix = "";
  switch (trigger) {
    case "created":
      prefix = "🆕 Новое обращение";
      break;
    case "assigned":
      prefix = "📌 Назначено на вас";
      break;
    case "overdue":
      prefix = "⚠️ Просрочено";
      break;
  }
  
  const plotInfo = appeal.plotNumber ? `\nУчасток: ${appeal.plotNumber}` : "";
  const title = appeal.title || "Без заголовка";
  const shortTitle = title.length > 60 ? title.substring(0, 57) + "..." : title;
  
  return `${prefix}${plotInfo}\n${shortTitle}\n\n${appealUrl}`;
}

/**
 * Sprint 5.2: Отправляет Telegram уведомление с дедупликацией и логированием
 */
async function sendTelegramNotification(
  userId: string,
  appeal: Appeal,
  trigger: "created" | "assigned" | "overdue"
): Promise<{ sent: boolean; reason?: string }> {
  const user = findUserById(userId);
  if (!user) {
    return { sent: false, reason: "user_not_found" };
  }
  
  if (!user.telegramChatId) {
    // Логируем причину пропуска
    await logActivity({
      actorUserId: null,
      actorRole: null,
      entityType: "notification",
      entityId: `telegram_${trigger}_${appeal.id}_${userId}`,
      action: "notification_skipped",
      meta: {
        channel: "telegram",
        trigger,
        toUserId: userId,
        appealId: appeal.id,
        reason: "telegramChatId_missing",
      },
    });
    return { sent: false, reason: "telegramChatId_missing" };
  }
  
  // Дедупликация
  const eventKey = `telegram_${trigger}_${appeal.id}_${userId}`;
  if (!canSendNotification(eventKey)) {
    return { sent: false, reason: "dedupe_skip" };
  }
  
  // Отправляем сообщение
  const message = formatTelegramMessage(appeal, trigger);
  const result = await sendTelegramMessage(user.telegramChatId, message);
  
  if (!result) {
    // Токен не настроен или другая ошибка
    await logActivity({
      actorUserId: null,
      actorRole: null,
      entityType: "notification",
      entityId: eventKey,
      action: "notification_failed",
      meta: {
        channel: "telegram",
        trigger,
        toUserId: userId,
        appealId: appeal.id,
        reason: "send_failed",
      },
    });
    return { sent: false, reason: "send_failed" };
  }
  
  // Логируем успешную отправку
  await logActivity({
    actorUserId: null,
    actorRole: null,
    entityType: "notification",
    entityId: eventKey,
    action: "notification_sent",
    meta: {
      channel: "telegram",
      trigger,
      toUserId: userId,
      appealId: appeal.id,
      providerMessageId: result.providerMessageId,
    },
  });
  
  return { sent: true };
}

/**
 * Sprint 5.2: Триггер 1 - Новое обращение создано
 * Отправляет уведомления secretary и chairman
 */
export async function triggerAppealCreated(appeal: Appeal): Promise<void> {
  const users = listUsers(100); // Получаем всех пользователей
  const recipients = users.filter(
    (user) => user.role === "secretary" || user.role === "chairman"
  );
  
  for (const user of recipients) {
    await sendTelegramNotification(user.id, appeal, "created");
  }
}

/**
 * Sprint 5.2: Триггер 2 - Назначено на меня
 * Отправляет уведомление пользователю, когда assignedToUserId меняется на его userId
 */
export async function triggerAppealAssigned(appeal: Appeal, assignedToUserId: string): Promise<void> {
  await sendTelegramNotification(assignedToUserId, appeal, "assigned");
}

/**
 * Sprint 5.2: Триггер 3 - Просрочка
 * Отправляет уведомление assignedToUserId, а если нет assignedTo — chairman
 */
export async function triggerAppealOverdue(appeal: Appeal): Promise<void> {
  if (appeal.status === "closed") {
    return; // Не отправляем для закрытых обращений
  }
  
  if (!appeal.dueAt) {
    return; // Нет срока - не проверяем
  }
  
  if (!overdue(appeal.dueAt)) {
    return; // Еще не просрочено
  }
  
  // Если есть assignedToUserId - отправляем ему
  if (appeal.assignedToUserId) {
    await sendTelegramNotification(appeal.assignedToUserId, appeal, "overdue");
    // Sprint 7.1: Внутреннее уведомление о просрочке
    try {
      const { notifyAppealOverdue } = await import("@/server/notifications/triggers");
      notifyAppealOverdue({ appeal });
    } catch (error) {
      // Игнорируем ошибки создания уведомлений (не критично)
      if (process.env.NODE_ENV !== "production") {
        console.error("[appeals] Failed to create internal notification:", error);
      }
    }
    return;
  }
  
  // Если нет assignedTo - отправляем chairman
  const users = listUsers(100);
  const chairman = users.find((user) => user.role === "chairman");
  if (chairman) {
    await sendTelegramNotification(chairman.id, appeal, "overdue");
    // Sprint 7.1: Внутреннее уведомление о просрочке
    try {
      const { notifyAppealOverdue } = await import("@/server/notifications/triggers");
      notifyAppealOverdue({ appeal });
    } catch (error) {
      // Игнорируем ошибки создания уведомлений (не критично)
      if (process.env.NODE_ENV !== "production") {
        console.error("[appeals] Failed to create internal notification:", error);
      }
    }
  }
}
