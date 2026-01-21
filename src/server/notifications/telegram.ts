import "server-only";

import { sendTelegramMessage } from "@/lib/notifications/telegram";
import { logActivity } from "@/lib/activityLog.store";
import type { Role } from "@/lib/permissions";
import type { InternalNotification } from "./internal.store";

/**
 * Sprint 7.2: Telegram доставка внутренних уведомлений
 */

/**
 * Маппинг chatId по ролям из env переменных
 * Формат: TELEGRAM_CHAT_ID_<ROLE> (например, TELEGRAM_CHAT_ID_ADMIN, TELEGRAM_CHAT_ID_CHAIRMAN)
 */
function getChatIdForRole(role: Role): string | null {
  const envKey = `TELEGRAM_CHAT_ID_${role.toUpperCase()}`;
  const chatId = process.env[envKey]?.trim();
  return chatId || null;
}

/**
 * Форматирует уведомление для отправки в Telegram
 */
function formatTelegramMessage(notification: InternalNotification): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  let message = `🔔 <b>${notification.title}</b>\n\n${notification.message}`;

  if (notification.appealId) {
    const appealUrl = `${baseUrl}/office/appeals/${notification.appealId}`;
    message += `\n\n<a href="${appealUrl}">Открыть обращение</a>`;
  }

  return message;
}

/**
 * Отправляет уведомление в Telegram по chatId
 * Логирует в ActivityLog: notification.sent + канал telegram
 */
export async function sendTelegram(
  text: string,
  chatId: string,
  notification: InternalNotification
): Promise<{ sent: boolean; providerMessageId?: string }> {
  // Проверяем, включена ли отправка через env
  const telegramEnabled = process.env.TELEGRAM_NOTIFICATIONS_ENABLED === "true";
  if (!telegramEnabled) {
    // Если не включено, не отправляем и не логируем
    return { sent: false };
  }

  try {
    const result = await sendTelegramMessage(chatId, text);

    if (!result) {
      // Токен не настроен или отправка не удалась
      await logActivity({
        actorUserId: null,
        actorRole: null,
        entityType: "notification",
        entityId: notification.id,
        action: "notification.sent",
        meta: {
          channel: "telegram",
          notificationId: notification.id,
          notificationType: notification.type,
          chatId: chatId.substring(0, 10) + "...", // Частичный chatId для безопасности
          success: false,
          reason: "telegram_not_configured_or_failed",
        },
      });
      return { sent: false };
    }

    // Логируем успешную отправку в ActivityLog
    await logActivity({
      actorUserId: null,
      actorRole: null,
      entityType: "notification",
      entityId: notification.id,
      action: "notification.sent",
      meta: {
        channel: "telegram",
        notificationId: notification.id,
        notificationType: notification.type,
        chatId: chatId.substring(0, 10) + "...", // Частичный chatId для безопасности
        providerMessageId: result.providerMessageId,
        success: true,
      },
    });

    return { sent: true, providerMessageId: result.providerMessageId };
  } catch (error) {
    // Логируем ошибку отправки
    await logActivity({
      actorUserId: null,
      actorRole: null,
      entityType: "notification",
      entityId: notification.id,
      action: "notification.sent",
      meta: {
        channel: "telegram",
        notificationId: notification.id,
        notificationType: notification.type,
        chatId: chatId.substring(0, 10) + "...",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return { sent: false };
  }
}

/**
 * Отправить уведомление в Telegram по роли
 * Получает chatId из env переменных (TELEGRAM_CHAT_ID_<ROLE>)
 */
export async function sendTelegramToRole(
  notification: InternalNotification,
  role: Role
): Promise<{ sent: boolean; providerMessageId?: string }> {
  const chatId = getChatIdForRole(role);
  if (!chatId) {
    // Нет chatId для роли - не отправляем
    return { sent: false };
  }

  const text = formatTelegramMessage(notification);
  return sendTelegram(text, chatId, notification);
}

/**
 * Отправить уведомление в Telegram по userId
 * Получает chatId из User модели (если есть telegramChatId)
 */
export async function sendTelegramToUser(
  notification: InternalNotification,
  userId: string
): Promise<{ sent: boolean; providerMessageId?: string }> {
  try {
    const { findUserById } = await import("@/lib/mockDb");
    const user = findUserById(userId);
    if (!user || !user.telegramChatId) {
      // Нет пользователя или telegramChatId - не отправляем
      return { sent: false };
    }

    const text = formatTelegramMessage(notification);
    return sendTelegram(text, user.telegramChatId, notification);
  } catch (error) {
    // Ошибка получения пользователя - не отправляем
    return { sent: false };
  }
}

/**
 * Отправить уведомление в Telegram (определяет получателя по notification.targetUserId/targetRole)
 * Вызывается при создании уведомления в triggers.ts
 */
export async function deliverNotificationToTelegram(
  notification: InternalNotification
): Promise<{ sent: boolean; providerMessageId?: string }> {
  // Если назначено пользователю - отправляем ему
  if (notification.targetUserId) {
    return sendTelegramToUser(notification, notification.targetUserId);
  }

  // Если назначено роли - отправляем роли
  if (notification.targetRole) {
    return sendTelegramToRole(notification, notification.targetRole);
  }

  // Нет получателя - не отправляем
  return { sent: false };
}
