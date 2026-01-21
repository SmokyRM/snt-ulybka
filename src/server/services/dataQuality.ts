import "server-only";

import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { assertCan, hasPermission, isStaffOrAdmin } from "@/lib/rbac";
import { logActivity } from "@/lib/activityLog.store";
import { getDb, listPayments } from "@/lib/mockDb";
import { listAppeals as listBaseAppeals, getAppeal as getBaseAppeal, setAppealAssignee, setAppealDue, updateAppealStatus as updateBaseAppealStatus } from "@/lib/appeals.store";
import { calculateDueAtByType, DEFAULT_SLA_HOURS } from "@/lib/appealsSla";
import { listRegistry } from "@/lib/registry.store";
import type { AppealStatus, AppealCategory } from "@/lib/office/types";

export type DataQualityIssueType = "plots" | "appeals" | "payments";

export type DataQualityIssue = {
  id: string;
  entityType: DataQualityIssueType;
  entityId: string;
  reason: string;
  severity: "low" | "medium" | "high";
  suggestedFix?: {
    type: string;
    payload?: Record<string, unknown>;
    label: string;
  };
  metadata?: Record<string, unknown>;
};

export type GetIssuesParams = {
  type?: DataQualityIssueType;
  limit?: number;
};

export type ApplyFixParams = {
  issueId: string;
  fixType: string;
  payload?: Record<string, unknown>;
};

/**
 * Проверка участков: нет контакта/владельца
 */
function checkPlots(): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const db = getDb();
  const registryItems = listRegistry({});

  // Проверяем участки из registry
  registryItems.forEach((item) => {
    const hasOwner = Boolean(item.ownerName && item.ownerName.trim());
    const hasContact = Boolean((item.phone && item.phone.trim()) || (item.email && item.email.trim()));

    if (!hasOwner && !hasContact) {
      issues.push({
        id: `plot_${item.id}_no_owner_no_contact`,
        entityType: "plots",
        entityId: item.id,
        reason: "Нет владельца и контактов",
        severity: "high",
        metadata: {
          plotNumber: item.plotNumber,
        },
      });
    } else if (!hasOwner) {
      issues.push({
        id: `plot_${item.id}_no_owner`,
        entityType: "plots",
        entityId: item.id,
        reason: "Нет владельца",
        severity: "medium",
        metadata: {
          plotNumber: item.plotNumber,
        },
      });
    } else if (!hasContact) {
      issues.push({
        id: `plot_${item.id}_no_contact`,
        entityType: "plots",
        entityId: item.id,
        reason: "Нет контактов",
        severity: "medium",
        metadata: {
          plotNumber: item.plotNumber,
        },
      });
    }
  });

  // Проверяем участки из mockDb
  db.plots.forEach((plot) => {
    const hasOwner = Boolean(plot.ownerFullName && plot.ownerFullName.trim());
    const hasContact = Boolean((plot.phone && plot.phone.trim()) || (plot.email && plot.email.trim()));

    // Пропускаем если уже есть в registry
    if (registryItems.some((item) => item.id === plot.id)) {
      return;
    }

    if (!hasOwner && !hasContact) {
      issues.push({
        id: `plot_${plot.id}_no_owner_no_contact`,
        entityType: "plots",
        entityId: plot.id,
        reason: "Нет владельца и контактов",
        severity: "high",
        metadata: {
          plotNumber: plot.plotNumber,
          street: plot.street,
        },
      });
    } else if (!hasOwner) {
      issues.push({
        id: `plot_${plot.id}_no_owner`,
        entityType: "plots",
        entityId: plot.id,
        reason: "Нет владельца",
        severity: "medium",
        metadata: {
          plotNumber: plot.plotNumber,
          street: plot.street,
        },
      });
    } else if (!hasContact) {
      issues.push({
        id: `plot_${plot.id}_no_contact`,
        entityType: "plots",
        entityId: plot.id,
        reason: "Нет контактов",
        severity: "medium",
        metadata: {
          plotNumber: plot.plotNumber,
          street: plot.street,
        },
      });
    }
  });

  return issues;
}

/**
 * Категории проблем с обращениями
 */
export type AppealQualityCategory = "missingContact" | "missingPlot" | "missingDueAt" | "missingAssignee";

/**
 * Проверка обращений: расширенная версия с категориями
 */
function checkAppeals(): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const appeals = listBaseAppeals({});

  appeals.forEach((appeal) => {
    // Пропускаем закрытые обращения
    if (appeal.status === "closed") {
      return;
    }

    // Категория 1: missingContact - нет контакта
    const hasContact = Boolean(
      (appeal.authorPhone && appeal.authorPhone.trim()) || 
      (appeal.authorName && appeal.authorName.trim())
    );
    if (!hasContact) {
      issues.push({
        id: `appeal_${appeal.id}_missing_contact`,
        entityType: "appeals",
        entityId: appeal.id,
        reason: "Отсутствует контакт (телефон или ФИО)",
        severity: "high",
        suggestedFix: {
          type: "apply_template",
          label: "Запросить уточнение",
          payload: { templateKey: "request_info" },
        },
        metadata: {
          title: appeal.title,
          plotNumber: appeal.plotNumber,
          status: appeal.status,
          category: "missingContact",
        },
      });
    }

    // Категория 2: missingPlot - нет участка
    if (!appeal.plotNumber || !appeal.plotNumber.trim()) {
      issues.push({
        id: `appeal_${appeal.id}_missing_plot`,
        entityType: "appeals",
        entityId: appeal.id,
        reason: "Отсутствует участок",
        severity: "medium",
        suggestedFix: {
          type: "link_to_plot",
          label: "Связать с участком",
        },
        metadata: {
          title: appeal.title,
          authorName: appeal.authorName,
          status: appeal.status,
          category: "missingPlot",
        },
      });
    }

    // Категория 3: missingDueAt - нет срока
    if (!appeal.dueAt) {
      issues.push({
        id: `appeal_${appeal.id}_missing_due_at`,
        entityType: "appeals",
        entityId: appeal.id,
        reason: "Отсутствует срок выполнения",
        severity: "high",
        suggestedFix: {
          type: "set_due_at_by_rule",
          label: "Установить срок по правилу",
        },
        metadata: {
          title: appeal.title,
          plotNumber: appeal.plotNumber,
          status: appeal.status,
          type: appeal.type,
          category: "missingDueAt",
        },
      });
    }

    // Категория 4: missingAssignee - нет назначения (Sprint 3.3: используем assignedToUserId)
    const assignedToUserId = appeal.assignedToUserId ?? appeal.assigneeUserId ?? null;
    if (!assignedToUserId && !appeal.assigneeRole) {
      issues.push({
        id: `appeal_${appeal.id}_missing_assignee`,
        entityType: "appeals",
        entityId: appeal.id,
        reason: "Нет ответственного",
        severity: appeal.status === "in_progress" ? "high" : "medium",
        suggestedFix: {
          type: "assign_to_role",
          label: "Назначить роль",
          payload: { role: "secretary" }, // По умолчанию secretary, можно изменить
        },
        metadata: {
          title: appeal.title,
          plotNumber: appeal.plotNumber,
          status: appeal.status,
          category: "missingAssignee",
        },
      });
    }
    
    // Sprint 7.5: Добавляем быстрые действия для всех категорий
    // Для missingContact: applyTemplate("request_clarification")
    if (!hasContact && !issues.some((i) => i.id === `appeal_${appeal.id}_missing_contact`)) {
      issues.push({
        id: `appeal_${appeal.id}_missing_contact`,
        entityType: "appeals",
        entityId: appeal.id,
        reason: "Отсутствует контакт (телефон или ФИО)",
        severity: "high",
        suggestedFix: {
          type: "apply_template",
          label: "Запросить уточнение",
          payload: { templateKey: "request_info" },
        },
        metadata: {
          title: appeal.title,
          plotNumber: appeal.plotNumber,
          status: appeal.status,
          category: "missingContact",
        },
      });
    }
    
    // Для missingPlot: можно добавить быстрый фикс (если нужно)
    
    // Для missingDueAt: setDueAtByRule (уже есть set_default_due_at, но можно добавить setDueAtByRule)
    
    // Для missingAssignee: assignToRole (добавим в applyFix)
  });

  return issues;
}

/**
 * Проверка платежей: нет plotId привязки
 */
function checkPayments(): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const payments = listPayments({ includeVoided: false });

  payments.forEach((payment) => {
    // Проверка: нет plotId или plotId пустой
    if (!payment.plotId || !payment.plotId.trim()) {
      issues.push({
        id: `payment_${payment.id}_no_plot`,
        entityType: "payments",
        entityId: payment.id,
        reason: "Нет привязки к участку",
        severity: "high",
        metadata: {
          amount: payment.amount,
          paidAt: payment.paidAt,
          method: payment.method,
        },
      });
    } else {
      // Проверка: plotId существует в базе
      const db = getDb();
      const plotExists = db.plots.some((p) => p.id === payment.plotId || p.plotId === payment.plotId);
      const registryItems = listRegistry({});
      const plotExistsInRegistry = registryItems.some((item) => item.id === payment.plotId);

      if (!plotExists && !plotExistsInRegistry) {
        issues.push({
          id: `payment_${payment.id}_invalid_plot`,
          entityType: "payments",
          entityId: payment.id,
          reason: "Участок не найден в базе",
          severity: "high",
          metadata: {
            plotId: payment.plotId,
            amount: payment.amount,
            paidAt: payment.paidAt,
          },
        });
      }
    }
  });

  return issues;
}

/**
 * Получить список проблем качества данных
 */
export async function getIssues(params: GetIssuesParams = {}): Promise<DataQualityIssue[]> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }

  // Проверка прав доступа
  const { type } = params;

  // Фильтрация по типу и правам доступа (v1 RBAC)
  let issues: DataQualityIssue[] = [];

  // admin/chairman/secretary видят appeals+plots
  const canSeeAppealsPlots = role === "admin" || role === "chairman" || role === "secretary";
  // accountant видит payments (если есть)
  const canSeePayments = role === "accountant" || role === "admin";

  if (!type || type === "plots") {
    if (canSeeAppealsPlots) {
      issues.push(...checkPlots());
    }
  }

  if (!type || type === "appeals") {
    if (canSeeAppealsPlots) {
      issues.push(...checkAppeals());
    }
  }

  if (!type || type === "payments") {
    if (canSeePayments) {
      const paymentIssues = checkPayments();
      // Если нет issues по payments, скрываем секцию
      if (paymentIssues.length > 0) {
        issues.push(...paymentIssues);
      }
    }
  }

  // Применяем лимит
  if (params.limit) {
    issues = issues.slice(0, params.limit);
  }

  return issues;
}

/**
 * Применить исправление к проблеме
 */
export async function applyFix(params: ApplyFixParams): Promise<{ success: boolean; message: string; redirectUrl?: string }> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }

  const { issueId, fixType, payload } = params;

  // Парсим issueId для получения типа и entityId
  // Формат: appeal_<entityId>_<category> или appeal_<entityId>_missing_<field>
  const parts = issueId.split("_");
  if (parts.length < 2) {
    throw new Error("INVALID_ISSUE_ID");
  }

  const entityType = parts[0] as DataQualityIssueType;
  
  // Для обращений: appeal_a1_missing_contact -> entityId = a1
  // Для обращений: appeal_a1_missing_due_at -> entityId = a1
  // Для обращений: appeal_a1_missing_plot -> entityId = a1
  // Для обращений: appeal_a1_missing_assignee -> entityId = a1
  let entityId: string;
  if (entityType === "appeals" && parts.length >= 3) {
    // Первая часть - "appeal", вторая - entityId, остальное - описание проблемы
    entityId = parts[1];
  } else {
    // Для других типов: plot_<id>_<reason> -> entityId = <id>
    entityId = parts.slice(1, -1).join("_");
  }

  // Проверка прав доступа в зависимости от типа
  if (entityType === "plots") {
    assertCan(role, "registry.view", undefined);
  } else if (entityType === "appeals") {
    assertCan(role, "appeals.view", "appeal");
    // Для фиксов appeals нужны дополнительные права
    if (fixType === "assign_to_me" || fixType === "set_default_due_at" || fixType === "set_due_date") {
      assertCan(role, "appeal.assign", "appeal");
    }
    if (fixType === "mark_needs_info") {
      assertCan(role, "appeal.updateStatus", "appeal");
    }
    // open_edit_contact и link_to_plot - только просмотр, права не требуются
  } else if (entityType === "payments") {
    assertCan(role, "finance.view", undefined);
    // Для фиксов payments нужны права на finance.manage
    assertCan(role, "finance.manage", undefined);
  }

  // Применяем фикс в зависимости от типа
  if (entityType === "appeals") {
    const appeal = getBaseAppeal(entityId);
    if (!appeal) {
      throw new Error("NOT_FOUND");
    }

    // Фикс 1: assign_to_me - назначить себе
    // Sprint 3.3: используем appendActivity для логирования
    if (fixType === "assign_to_me") {
      const roleForAssign: "chairman" | "secretary" | "accountant" | "admin" =
        role === "admin" ? "admin" : role === "chairman" || role === "secretary" ? role : "secretary";
      setAppealAssignee(entityId, roleForAssign, user.id);

      // Sprint 3.3: Логируем в ActivityLog используя appendActivity
      const { appendActivity } = await import("@/lib/activityLog");
      appendActivity("appeal", entityId, "assigned", user.id, {
        from: null,
        to: user.id,
        source: "quality_fix",
        issueId,
      });

      return { success: true, message: "Обращение назначено на вас" };
    }

    // Фикс 2: set_default_due_at - установить дефолтный срок на основе типа (legacy)
    // Sprint 3.3: используем appendActivity и устанавливаем dueAtSource="auto"
    if (fixType === "set_default_due_at") {
      // Определяем тип обращения (если нет - используем general)
      const appealType: AppealCategory = appeal.type || "general";
      const dueAt = calculateDueAtByType(appealType);
      
      // Устанавливаем dueAt с dueAtSource="auto"
      setAppealDue(entityId, dueAt, "auto");

      // Sprint 3.3: Логируем в ActivityLog как "system_rule_applied" или "due_set"
      const { appendActivity } = await import("@/lib/activityLog");
      appendActivity("appeal", entityId, "system_rule_applied", user.id, {
        ruleName: "quality_fix_set_default_due_at",
        changes: { dueAt, dueAtSource: "auto" },
        appealType,
        source: "quality_fix",
        issueId,
      });

      return { success: true, message: "Срок выполнения установлен по умолчанию" };
    }

    // Sprint 7.5: Фикс: set_due_at_by_rule - установить срок по SLA правилу
    if (fixType === "set_due_at_by_rule") {
      // Определяем тип обращения (если нет - используем general)
      const appealType: AppealCategory = appeal.type || "general";
      const { calculateDueAtByType: calculateDueAtBySlaRules } = await import("@/config/slaRules");
      const dueAt = calculateDueAtBySlaRules(appealType);
      
      // Устанавливаем dueAt с dueAtSource="auto"
      setAppealDue(entityId, dueAt, "auto");

      // Логируем в ActivityLog
      const { appendActivity } = await import("@/lib/activityLog");
      appendActivity("appeal", entityId, "sla.set", user.id, {
        type: appealType,
        dueAt,
        dueAtSource: "auto",
        source: "quality_fix",
        issueId,
      });

      return { success: true, message: "Срок выполнения установлен по правилу SLA" };
    }

    // Sprint 7.5: Фикс: assign_to_role - назначить роль
    if (fixType === "assign_to_role") {
      const targetRole = (payload?.role as "chairman" | "secretary" | "accountant" | "admin") || "secretary";
      
      // Используем assignToRole из services/appeals
      const { assignToRole } = await import("@/server/services/appeals");
      await assignToRole(entityId, targetRole);

      // Логируем в ActivityLog
      const { appendActivity } = await import("@/lib/activityLog");
      appendActivity("appeal", entityId, "reassigned", user.id, {
        from: appeal.assigneeRole ?? null,
        toRole: targetRole,
        source: "quality_fix",
        issueId,
      });

      return { success: true, message: `Обращение назначено роли: ${targetRole}` };
    }

    // Sprint 7.5: Фикс: apply_template - применить шаблон
    if (fixType === "apply_template") {
      const templateKey = payload?.templateKey as string | undefined;
      if (!templateKey) {
        throw new Error("templateKey is required");
      }

      // Используем applyTemplateToAppeal из services/appealTemplates
      const { applyTemplateToAppeal } = await import("@/server/services/appealTemplates");
      await applyTemplateToAppeal({
        appealId: entityId,
        templateKey,
      });

      // Логируем в ActivityLog (applyTemplateToAppeal уже логирует template.applied, но добавим source)
      const { appendActivity } = await import("@/lib/activityLog");
      appendActivity("appeal", entityId, "template.applied", user.id, {
        templateKey,
        source: "quality_fix",
        issueId,
      });

      return { success: true, message: `Применен шаблон: ${templateKey}` };
    }

    // Фикс 3: set_due_date - установить срок на N дней (legacy, для обратной совместимости)
    if (fixType === "set_due_date") {
      const days = (payload?.days as number) ?? 3;
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + days);
      
      setAppealDue(entityId, dueAt.toISOString(), "manual");

      // Логируем в ActivityLog для обращения (транзакционно)
      logActivity({
        actorUserId: user.id,
        actorRole: role,
        entityType: "appeal",
        entityId: entityId,
        action: "appeal.due_at_set",
        meta: {
          dueAt: dueAt.toISOString(),
          days,
          source: "quality_fix",
          issueId,
        },
      });

      return { success: true, message: `Срок выполнения установлен на ${days} дней` };
    }

    // Фикс 4: open_edit_contact - возвращаем ссылку на редактирование
    if (fixType === "open_edit_contact") {
      // Логируем действие открытия для редактирования
      logActivity({
        actorUserId: user.id,
        actorRole: role,
        entityType: "appeal",
        entityId: entityId,
        action: "appeal.quality_fix_viewed",
        meta: {
          fixType: "open_edit_contact",
          source: "quality_fix",
          issueId,
        },
      });

      // Возвращаем ссылку на страницу обращения для редактирования
      return { 
        success: true, 
        message: "Откройте обращение для редактирования контакта",
        redirectUrl: `/office/appeals/${entityId}`,
      };
    }

    // Фикс 5: link_to_plot - возвращаем ссылку на связывание с участком
    if (fixType === "link_to_plot") {
      // Логируем действие открытия для связывания
      logActivity({
        actorUserId: user.id,
        actorRole: role,
        entityType: "appeal",
        entityId: entityId,
        action: "appeal.quality_fix_viewed",
        meta: {
          fixType: "link_to_plot",
          source: "quality_fix",
          issueId,
        },
      });

      // Возвращаем ссылку на страницу обращения для связывания с участком
      return { 
        success: true, 
        message: "Откройте обращение для связывания с участком",
        redirectUrl: `/office/appeals/${entityId}`,
      };
    }

    // Фикс 6: mark_needs_info (legacy)
    if (fixType === "mark_needs_info") {
      updateBaseAppealStatus(entityId, "needs_info", role === "admin" ? "admin" : "secretary");

      // Логируем в ActivityLog для обращения (транзакционно)
      logActivity({
        actorUserId: user.id,
        actorRole: role,
        entityType: "appeal",
        entityId: entityId,
        action: "appeal.status_changed",
        meta: {
          oldStatus: appeal.status,
          newStatus: "needs_info",
          source: "quality_fix",
          issueId,
        },
      });

      return { success: true, message: "Статус изменен на 'Требуется уточнение'" };
    }
  }

  // Для других типов фиксов логируем в data_quality
  logActivity({
    actorUserId: user.id,
    actorRole: role,
    entityType: "data_quality",
    entityId: issueId,
    action: "quality_fix_applied",
    meta: {
      fixType,
      entityType,
      entityId,
      payload,
    },
  });

  return { success: true, message: "Исправление применено" };
}
