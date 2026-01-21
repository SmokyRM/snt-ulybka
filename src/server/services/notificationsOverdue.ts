import "server-only";

import { listAppeals as listBaseAppeals } from "@/lib/appeals.store";
import { sendEvent } from "./notifications";
import { isOverdue } from "@/lib/appealsSla";

/**
 * Проверяет просроченные обращения и отправляет уведомления
 * Вызывается при чтении inbox или через cron/job
 * 
 * Использует дедупликацию: не отправляет повторные уведомления для одного обращения
 */
const notifiedOverdueAppeals = new Set<string>();

export async function checkAndNotifyOverdue(): Promise<{ checked: number; notified: number }> {
  const now = new Date();
  const appeals = listBaseAppeals({});
  
  let checked = 0;
  let notified = 0;

  for (const appeal of appeals) {
    // Пропускаем закрытые обращения
    if (appeal.status === "closed") {
      // Удаляем из множества уведомленных, если обращение закрыто
      notifiedOverdueAppeals.delete(appeal.id);
      continue;
    }
    
    // Пропускаем обращения без dueAt
    if (!appeal.dueAt) continue;

    checked++;

    // Проверяем просрочку используя единообразную функцию
    if (isOverdue(appeal.dueAt, appeal.status)) {
      // Дедупликация: не отправляем повторные уведомления
      if (notifiedOverdueAppeals.has(appeal.id)) {
        continue;
      }

      try {
        const result = await sendEvent("appeal.overdue", {
          appealId: appeal.id,
          title: appeal.title,
          plotNumber: appeal.plotNumber,
          dueAt: appeal.dueAt,
          status: appeal.status,
          assignedTo: appeal.assigneeUserId,
        });

        // Помечаем как уведомленное только если отправка успешна
        if (result.sent > 0) {
          notifiedOverdueAppeals.add(appeal.id);
          notified++;
        }
      } catch (error) {
        console.error(`[notifications] Failed to send overdue notification for appeal ${appeal.id}:`, error);
      }
    } else {
      // Если обращение больше не просрочено, удаляем из множества
      notifiedOverdueAppeals.delete(appeal.id);
    }
  }

  return { checked, notified };
}
