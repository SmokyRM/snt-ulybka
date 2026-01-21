import "server-only";

import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import { logActivity } from "@/lib/activityLog.store";
import { getActionTemplate, renderActionTemplate } from "@/lib/actionTemplates.store";
import { addAppealComment, updateAppealStatus, updateAppealTypeService, assignToRole } from "@/server/services/appeals";
import type { AppealStatus, AppealCategory } from "@/lib/office/types";
import { getAppeal } from "@/server/services/appeals";

export type ApplyTemplateParams = {
  appealId: string;
  templateKey: string;
};

/**
 * Применить шаблон действия к обращению
 * 
 * Выполняет:
 * 1. Создает комментарий с текстом шаблона
 * 2. Меняет статус/тип при необходимости
 * 3. Назначает на роль при необходимости
 * 4. Логирует все действия в ActivityLog
 */
export async function applyActionTemplate(params: ApplyTemplateParams): Promise<{
  success: boolean;
  commentId?: string;
  statusChanged?: boolean;
  typeChanged?: boolean;
  assigned?: boolean;
}> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.manage", "appeal");

  // Получаем шаблон
  const template = getActionTemplate(params.templateKey);
  if (!template) {
    throw new Error("TEMPLATE_NOT_FOUND");
  }

  // Проверяем права на использование шаблона
  if (!template.allowedRoles.includes(role)) {
    throw new Error("FORBIDDEN");
  }

  // Получаем обращение для контекста
  const appeal = await getAppeal(params.appealId);
  if (!appeal) {
    throw new Error("APPEAL_NOT_FOUND");
  }

  // Рендерим текст шаблона с переменными
  const renderedText = renderActionTemplate(template, {
    appealTitle: appeal.title,
    plotNumber: appeal.plotNumber,
    authorName: appeal.authorName,
  });

  let commentId: string | undefined;
  let statusChanged = false;
  let typeChanged = false;
  let assigned = false;

  // 1. Создаем комментарий
  try {
    const comment = await addAppealComment(params.appealId, { text: renderedText });
    commentId = comment.id;

    // Логируем создание комментария через шаблон
    await logActivity({
      actorUserId: user.id,
      actorRole: role,
      entityType: "appeal",
      entityId: params.appealId,
      action: "template_applied",
      meta: {
        templateKey: params.templateKey,
        templateTitle: template.title,
        commentId: comment.id,
      },
    });
  } catch (error) {
    throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 2. Меняем статус при необходимости
  if (template.statusChange && appeal.status !== template.statusChange) {
    try {
      await updateAppealStatus(params.appealId, { status: template.statusChange });
      statusChanged = true;

      // Логируем изменение статуса через шаблон
      await logActivity({
        actorUserId: user.id,
        actorRole: role,
        entityType: "appeal",
        entityId: params.appealId,
        action: "status_changed",
        meta: {
          templateKey: params.templateKey,
          templateTitle: template.title,
          oldStatus: appeal.status,
          newStatus: template.statusChange,
          viaTemplate: true,
        },
      });
    } catch (error) {
      // Не критично, продолжаем
      console.error(`[actionTemplates] Failed to update status:`, error);
    }
  }

  // 3. Меняем тип при необходимости
  if (template.typeChange && appeal.type !== template.typeChange) {
    try {
      await updateAppealTypeService(params.appealId, template.typeChange);
      typeChanged = true;

      // Логируем изменение типа через шаблон
      await logActivity({
        actorUserId: user.id,
        actorRole: role,
        entityType: "appeal",
        entityId: params.appealId,
        action: "type_changed",
        meta: {
          templateKey: params.templateKey,
          templateTitle: template.title,
          oldType: appeal.type,
          newType: template.typeChange,
          viaTemplate: true,
        },
      });
    } catch (error) {
      // Не критично, продолжаем
      console.error(`[actionTemplates] Failed to update type:`, error);
    }
  }

  // 4. Назначаем на роль при необходимости
  if (template.assignToRole) {
    const targetRole = template.assignToRole;
    // Проверяем, что роль является допустимой для назначения
    if (targetRole === "chairman" || targetRole === "secretary" || targetRole === "accountant" || targetRole === "admin") {
      try {
        await assignToRole(params.appealId, targetRole);
        assigned = true;

        // Логируем назначение через шаблон
        await logActivity({
          actorUserId: user.id,
          actorRole: role,
          entityType: "appeal",
          entityId: params.appealId,
          action: "assigned",
          meta: {
            templateKey: params.templateKey,
            templateTitle: template.title,
            assignedRole: targetRole,
            viaTemplate: true,
          },
        });
      } catch (error) {
        // Не критично, продолжаем
        console.error(`[actionTemplates] Failed to assign:`, error);
      }
    }
  }

  return {
    success: true,
    commentId,
    statusChanged,
    typeChanged,
    assigned,
  };
}
