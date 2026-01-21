import "server-only";

import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { assertCan, hasPermission, isStaffOrAdmin } from "@/lib/rbac";
import { getTemplateByKey } from "@/lib/templates.store";
import { getAppeal, updateAppealStatus, addAppealComment } from "@/server/services/appeals";
import { assignToRole } from "@/server/services/appeals";
import { appendActivity } from "@/lib/activityLog";

/**
 * Sprint 5.4: Применить шаблон к обращению
 */
export async function applyTemplateToAppeal(params: {
  appealId: string;
  templateKey: string;
}): Promise<void> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  if (!hasPermission(role, "appeals.manage")) {
    throw new Error("FORBIDDEN");
  }

  // Получаем шаблон
  const template = getTemplateByKey(params.templateKey);
  if (!template) {
    throw new Error(`Template with key "${params.templateKey}" not found`);
  }

  // Проверяем права на использование шаблона
  if (!template.allowedRoles.includes(role)) {
    throw new Error("FORBIDDEN");
  }

  // Получаем обращение
  const appeal = await getAppeal(params.appealId);
  if (!appeal) {
    throw new Error("NOT_FOUND");
  }

  // Применяем действия шаблона
  const actions = template.actions;

  // 1. Изменить статус (если предусмотрено)
  if (actions.setStatus) {
    await updateAppealStatus(params.appealId, { status: actions.setStatus });
  }

  // 2. Назначить роль (если предусмотрено)
  if (actions.assignRole) {
    await assignToRole(params.appealId, actions.assignRole);
  }

  // 3. Добавить комментарий (если предусмотрено)
  if (actions.addComment && template.body) {
    await addAppealComment(params.appealId, { text: template.body });
  } else if (template.body && !actions.addComment) {
    // Если body есть, но addComment не указан явно, все равно добавляем в ActivityLog
    // Это для обратной совместимости
  }

  // 4. Логируем применение шаблона в ActivityLog (Sprint 7.0: template.applied)
  appendActivity(
    "appeal",
    params.appealId,
    "template.applied",
    user.id,
    {
      templateKey: params.templateKey,
      templateTitle: template.title,
      actions: actions,
    }
  );

  // Sprint 7.1: Внутреннее уведомление о применении шаблона
  try {
    const { notifyTemplateApplied } = await import("@/server/notifications/triggers");
    const updatedAppeal = await getAppeal(params.appealId);
    if (updatedAppeal) {
      notifyTemplateApplied({
        appeal: updatedAppeal,
        templateKey: params.templateKey,
        templateTitle: template.title,
        appliedByUserId: user.id ?? "",
      });
    }
  } catch (error) {
    // Игнорируем ошибки создания уведомлений (не критично)
    if (process.env.NODE_ENV !== "production") {
      console.error("[appeal-templates] Failed to create internal notification:", error);
    }
  }
}
