import "server-only";

import { getAppeal as getBaseAppeal, updateAppealStatus as updateBaseAppealStatus, addAppealComment } from "@/lib/appeals.store";
import { getTemplateBySlug } from "@/lib/templates";
import { logActivity } from "@/lib/activityLog.store";
import { triageAppeal } from "@/lib/appealsTriage";
import type { Appeal } from "@/lib/office/types";

/**
 * Автоматически запросить уточнение с использованием шаблона
 */
export async function requestInfoWithTemplate(appealId: string): Promise<{ success: boolean; message?: string }> {
  const appeal = getBaseAppeal(appealId);
  if (!appeal) {
    return { success: false, message: "Обращение не найдено" };
  }

  // Проверяем, нужно ли запрашивать уточнение
  const triage = triageAppeal(appeal);
  if (!triage.needsInfo && triage.category !== "insufficient_data") {
    return { success: false, message: "Уточнение не требуется" };
  }

  // Получаем шаблон для запроса уточнения
  // Ищем шаблон "appeal" или используем дефолтный текст
  let templateText = "Просим уточнить следующие данные:\n\n";
  
  try {
    const template = await getTemplateBySlug("appeal");
    if (template) {
      templateText = template.content;
    }
  } catch {
    // Используем дефолтный текст если шаблон не найден
  }

  // Форматируем шаблон с данными обращения
  const formattedText = templateText
    .replace(/\{\{title\}\}/g, appeal.title)
    .replace(/\{\{plotNumber\}\}/g, appeal.plotNumber || "не указан")
    .replace(/\{\{authorName\}\}/g, appeal.authorName || "не указано");

  // Меняем статус на needs_info
  updateBaseAppealStatus(appealId, "needs_info", "secretary");

  // Добавляем комментарий с шаблоном
  addAppealComment(appealId, "secretary", formattedText);

  // Логируем авто-действие
  logActivity({
    actorUserId: null,
    actorRole: "system",
    entityType: "appeal",
    entityId: appealId,
    action: "appeal.auto_request_info",
    payload: {
      category: triage.category,
      templateUsed: "appeal",
    },
  });

  return { success: true, message: "Запрос уточнения отправлен" };
}

/**
 * Автоматически определить категорию и назначить исполнителя
 */
export function autoTriageAppeal(appeal: Appeal): {
  category: string;
  assigneeRole?: "chairman" | "secretary" | "accountant" | "admin";
  priority?: "low" | "medium" | "high";
} {
  const triage = triageAppeal(appeal);
  
  // Логируем авто-действие
  logActivity({
    actorUserId: null,
    actorRole: "system",
    entityType: "appeal",
    entityId: appeal.id,
    action: "appeal.auto_triage",
    payload: {
      category: triage.category,
      assigneeRole: triage.assigneeRole,
      priority: triage.priority,
    },
  });

  return {
    category: triage.category,
    assigneeRole: triage.assigneeRole,
    priority: triage.priority,
  };
}
