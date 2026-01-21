import "server-only";

import { getDb, findUserById } from "@/lib/mockDb";
import { listAppeals as listBaseAppeals } from "@/lib/appeals.store";
import { overdue, dueSoon } from "@/lib/sla"; // Sprint 5.3: используем функции из sla.ts
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import type { AppealStatus } from "@/lib/office/types";

export type DailyDigestData = {
  myOpen: number;
  overdue: number;
  dueSoon: number;
  newToday: number; // Новые за последние 24 часа
};

/**
 * Генерирует данные для ежедневного дайджеста для конкретного пользователя
 */
export function generateDailyDigestData(userId: string, role: Role): DailyDigestData {
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setHours(yesterday.getHours() - 24);

  // Получаем все обращения
  const appeals = listBaseAppeals({});

  let myOpen = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let newToday = 0;
  
  for (const appeal of appeals) {
    const isOpen = appeal.status !== "closed";
    // Sprint 5.3: используем assignedToUserId вместо assigneeUserId
    const isMine = appeal.assignedToUserId === userId;
    const createdAt = new Date(appeal.createdAt);
    const isNewToday = createdAt >= yesterday;

    if (isOpen) {
      // Мои открытые обращения
      if (isMine) {
        myOpen++;

        // Sprint 5.3: Проверяем overdue и dueSoon только для моих открытых обращений
        // Используем функции из sla.ts
        if (appeal.dueAt) {
          if (overdue(appeal.dueAt, now)) {
            overdueCount++;
          } else if (dueSoon(appeal.dueAt, now)) {
            dueSoonCount++;
          }
        }
      }

      // Новые за сутки (все открытые, не только мои)
      if (isNewToday) {
        newToday++;
      }
    }
  }

  return {
    myOpen,
    overdue: overdueCount,
    dueSoon: dueSoonCount,
    newToday,
  };
}

/**
 * Форматирует дайджест в текстовое сообщение для Telegram
 */
export function formatDailyDigest(role: Role, data: DailyDigestData): string {
  const roleLabels: Record<string, string> = {
    secretary: "Секретарь",
    accountant: "Бухгалтер",
    chairman: "Председатель",
    admin: "Администратор",
    board: "Правление",
    user: "Пользователь",
    resident: "Житель",
    operator: "Оператор",
  };

  const roleLabel = roleLabels[role] || role;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const inboxMineUrl = `${baseUrl}/office/inbox?mine=1`; // Sprint 5.3: ссылка на мои обращения
  const inboxOverdueUrl = `${baseUrl}/office/inbox?risk=overdue`; // Sprint 5.3: ссылка на просроченные

  let message = `📊 <b>Ежедневный дайджест для ${roleLabel}</b>\n\n`;

  // Мои открытые
  if (data.myOpen > 0) {
    message += `📌 <b>Мои открытые:</b> ${data.myOpen}\n`;
  } else {
    message += `✅ <b>Мои открытые:</b> 0 (все выполнено!)\n`;
  }

  // Просрочено
  if (data.overdue > 0) {
    message += `⚠️ <b>Просрочено:</b> ${data.overdue}\n`;
  } else {
    message += `✅ <b>Просрочено:</b> 0\n`;
  }

  // Скоро срок
  if (data.dueSoon > 0) {
    message += `⏰ <b>Скоро срок:</b> ${data.dueSoon}\n`;
  } else {
    message += `✅ <b>Скоро срок:</b> 0\n`;
  }

  // Новые за сутки
  if (data.newToday > 0) {
    message += `🆕 <b>Новые за сутки:</b> ${data.newToday}\n`;
  } else {
    message += `📭 <b>Новые за сутки:</b> 0\n`;
  }

  // Sprint 5.3: Ссылки на inbox с фильтрами
  message += `\n<a href="${inboxMineUrl}">Мои обращения</a>`;
  if (data.overdue > 0) {
    message += ` | <a href="${inboxOverdueUrl}">Просроченные</a>`;
  }

  return message;
}
