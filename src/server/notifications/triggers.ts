import "server-only";

import { createNotification } from "./internal.store";
import { deliverNotificationToTelegram } from "./telegram";
import type { Appeal } from "@/lib/office/types";
import type { Role } from "@/lib/permissions";

/**
 * Sprint 7.1: Триггеры для создания внутренних уведомлений
 */

/**
 * Триггер: обращение назначено/переназначено
 */
export function notifyAppealAssigned(params: {
  appeal: Appeal;
  assignedToUserId?: string | null;
  assignedToRole?: Role | null;
  previousAssigneeUserId?: string | null;
  previousAssigneeRole?: Role | null;
}): void {
  const { appeal, assignedToUserId, assignedToRole, previousAssigneeUserId, previousAssigneeRole } = params;

  // Если назначено пользователю, отправляем уведомление ему
  if (assignedToUserId) {
    const isReassigned = previousAssigneeUserId && previousAssigneeUserId !== assignedToUserId;
    const notification = createNotification({
      type: isReassigned ? "appeal.reassigned" : "appeal.assigned",
      title: isReassigned ? "Обращение переназначено на вас" : "Обращение назначено на вас",
      message: `${appeal.title}${appeal.plotNumber ? ` (${appeal.plotNumber})` : ""}`,
      targetUserId: assignedToUserId,
      targetRole: null,
      appealId: appeal.id,
      meta: {
        previousAssigneeUserId,
        previousAssigneeRole,
      },
    });

    // Sprint 7.2: Отправляем в Telegram если включено
    deliverNotificationToTelegram(notification).catch((error) => {
      // Игнорируем ошибки отправки в Telegram (не критично)
      if (process.env.NODE_ENV !== "production") {
        console.error("[notifications] Failed to send to Telegram:", error);
      }
    });
  } else if (assignedToRole) {
    // Если назначено роли, отправляем уведомление всем с этой ролью
    const notification = createNotification({
      type: previousAssigneeRole ? "appeal.reassigned" : "appeal.assigned",
      title: previousAssigneeRole ? "Обращение переназначено" : "Обращение назначено",
      message: `${appeal.title}${appeal.plotNumber ? ` (${appeal.plotNumber})` : ""}`,
      targetUserId: null,
      targetRole: assignedToRole,
      appealId: appeal.id,
      meta: {
        previousAssigneeUserId,
        previousAssigneeRole,
      },
    });

    // Sprint 7.2: Отправляем в Telegram если включено
    deliverNotificationToTelegram(notification).catch((error) => {
      // Игнорируем ошибки отправки в Telegram (не критично)
      if (process.env.NODE_ENV !== "production") {
        console.error("[notifications] Failed to send to Telegram:", error);
      }
    });
  }
}

/**
 * Триггер: применен шаблон к обращению
 */
export function notifyTemplateApplied(params: {
  appeal: Appeal;
  templateKey: string;
  templateTitle: string;
  appliedByUserId: string;
}): void {
  const { appeal, templateKey, templateTitle, appliedByUserId } = params;

  // Уведомляем назначенного пользователя или роль, если обращение назначено
  if (appeal.assignedToUserId) {
    const notification = createNotification({
      type: "appeal.template_applied",
      title: `Применен шаблон: ${templateTitle}`,
      message: `${appeal.title}${appeal.plotNumber ? ` (${appeal.plotNumber})` : ""}`,
      targetUserId: appeal.assignedToUserId,
      targetRole: null,
      appealId: appeal.id,
      meta: {
        templateKey,
        templateTitle,
        appliedByUserId,
      },
    });

    // Sprint 7.2: Отправляем в Telegram если включено
    deliverNotificationToTelegram(notification).catch((error) => {
      // Игнорируем ошибки отправки в Telegram (не критично)
      if (process.env.NODE_ENV !== "production") {
        console.error("[notifications] Failed to send to Telegram:", error);
      }
    });
  } else if (appeal.assigneeRole) {
    const notification = createNotification({
      type: "appeal.template_applied",
      title: `Применен шаблон: ${templateTitle}`,
      message: `${appeal.title}${appeal.plotNumber ? ` (${appeal.plotNumber})` : ""}`,
      targetUserId: null,
      targetRole: appeal.assigneeRole,
      appealId: appeal.id,
      meta: {
        templateKey,
        templateTitle,
        appliedByUserId,
      },
    });

    // Sprint 7.2: Отправляем в Telegram если включено
    deliverNotificationToTelegram(notification).catch((error) => {
      // Игнорируем ошибки отправки в Telegram (не критично)
      if (process.env.NODE_ENV !== "production") {
        console.error("[notifications] Failed to send to Telegram:", error);
      }
    });
  }
}

/**
 * Триггер: обращение просрочено
 */
export function notifyAppealOverdue(params: {
  appeal: Appeal;
}): void {
  const { appeal } = params;

  // Уведомляем назначенного пользователя или роль
  if (appeal.assignedToUserId) {
    const notification = createNotification({
      type: "appeal.overdue",
      title: "Обращение просрочено",
      message: `${appeal.title}${appeal.plotNumber ? ` (${appeal.plotNumber})` : ""}${appeal.dueAt ? `. Срок: ${new Date(appeal.dueAt).toLocaleDateString("ru-RU")}` : ""}`,
      targetUserId: appeal.assignedToUserId,
      targetRole: null,
      appealId: appeal.id,
      meta: {
        dueAt: appeal.dueAt,
      },
    });

    // Sprint 7.2: Отправляем в Telegram если включено
    deliverNotificationToTelegram(notification).catch((error) => {
      // Игнорируем ошибки отправки в Telegram (не критично)
      if (process.env.NODE_ENV !== "production") {
        console.error("[notifications] Failed to send to Telegram:", error);
      }
    });
  } else if (appeal.assigneeRole) {
    const notification = createNotification({
      type: "appeal.overdue",
      title: "Обращение просрочено",
      message: `${appeal.title}${appeal.plotNumber ? ` (${appeal.plotNumber})` : ""}${appeal.dueAt ? `. Срок: ${new Date(appeal.dueAt).toLocaleDateString("ru-RU")}` : ""}`,
      targetUserId: null,
      targetRole: appeal.assigneeRole,
      appealId: appeal.id,
      meta: {
        dueAt: appeal.dueAt,
      },
    });

    // Sprint 7.2: Отправляем в Telegram если включено
    deliverNotificationToTelegram(notification).catch((error) => {
      // Игнорируем ошибки отправки в Telegram (не критично)
      if (process.env.NODE_ENV !== "production") {
        console.error("[notifications] Failed to send to Telegram:", error);
      }
    });
  }
}
