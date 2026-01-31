import "server-only";

import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { assertCan, hasPermission, isStaffOrAdmin } from "@/lib/rbac";
import { logActivity, getActivityLog } from "@/lib/activityLog.store";
import {
  getAppeal as getBaseAppeal,
  listAppeals as listBaseAppeals,
  updateAppealStatus as updateBaseAppealStatus,
  addAppealComment as addBaseAppealComment,
  setAppealAssignee,
  updateAppealType,
} from "@/lib/appeals.store";
import type { AppealStatus, AppealCategory } from "@/lib/office/types";
import type { Appeal, AppealComment } from "@/lib/office/types";

export type ListAppealsParams = {
  status?: AppealStatus;
  q?: string;
  assignedTo?: string;
};

const mapAppeal = (item: ReturnType<typeof listBaseAppeals>[number]): Appeal => ({
  id: item.id,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  title: item.title,
  body: item.body,
  status: item.status,
  plotNumber: item.plotNumber,
  authorId: item.authorId,
  authorName: item.authorName,
  authorPhone: item.authorPhone,
  comments: item.comments,
  assigneeRole: item.assigneeRole,
  assigneeUserId: item.assigneeUserId,
  assignedToUserId: item.assignedToUserId ?? item.assigneeUserId ?? null, // Sprint 2.1
  assignedAt: item.assignedAt ?? null,
  dueAt: item.dueAt,
  dueAtSource: item.dueAtSource,
  slaDays: item.slaDays, // Sprint 34
  closedAt: item.closedAt, // Sprint 34
  priority: item.priority,
  history: item.history,
  replyDraft: item.replyDraft,
});

async function guardOfficeAccess() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.read", "appeal");
  return { user, role };
}

export async function listAppeals(params: ListAppealsParams = {}): Promise<Appeal[]> {
  await guardOfficeAccess();
  let appeals = listBaseAppeals({ status: params.status, q: params.q });
  if (params.assignedTo) {
    appeals = appeals.filter(
      (appeal) => appeal.assigneeUserId === params.assignedTo || appeal.assigneeRole === params.assignedTo
    );
  }
  return appeals.map(mapAppeal);
}

export async function listAppealsPaged(params: ListAppealsParams & { page?: number; limit?: number }) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.read", "appeal");

  let appeals = listBaseAppeals({ status: params.status, q: params.q });
  if (params.assignedTo) {
    appeals = appeals.filter(
      (appeal) => appeal.assigneeUserId === params.assignedTo || appeal.assigneeRole === params.assignedTo
    );
  }

  const total = appeals.length;
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(5, params.limit ?? 10));
  const start = (page - 1) * limit;
  const items = appeals.slice(start, start + limit).map(mapAppeal);

  return { items, total, page, limit };
}

export async function getAppeal(id: string): Promise<Appeal | null> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.read", "appeal");

  const found = getBaseAppeal(id);
  if (!found) return null;

  // Миграция Sprint 2.1: синхронизация assigneeUserId -> assignedToUserId
  const assignedToUserId = found.assignedToUserId ?? found.assigneeUserId ?? null;
  const assignedAt = found.assignedAt ?? null;
  
  return {
    id: found.id,
    createdAt: found.createdAt,
    updatedAt: found.updatedAt,
    title: found.title,
    body: found.body,
    status: found.status,
    plotNumber: found.plotNumber,
    authorId: found.authorId,
    authorName: found.authorName,
    authorPhone: found.authorPhone,
    comments: found.comments,
    assigneeRole: found.assigneeRole,
    assigneeUserId: found.assigneeUserId,
    assignedToUserId, // Sprint 2.1
    assignedAt,
    dueAt: found.dueAt,
    priority: found.priority,
    history: found.history,
    replyDraft: found.replyDraft,
  };
}

export async function updateAppealStatus(
  id: string,
  params: { status: AppealStatus; comment?: string },
): Promise<Appeal> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";

  // Проверка прав через assertCan(role, action, entityType)
  // Только chairman/secretary/admin могут менять статус
  if (role !== "admin" && role !== "chairman" && role !== "secretary") {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.updateStatus", "appeal");

  const appeal = getBaseAppeal(id);
  if (!appeal) {
    throw new Error("NOT_FOUND");
  }

  const oldStatus = appeal.status;

  // Валидация перехода статуса через state machine
  const { validateTransition } = await import("@/lib/appealsWorkflow");
  const validation = validateTransition(oldStatus, params.status);
  if (!validation.valid) {
    throw new Error(validation.error || "INVALID_TRANSITION");
  }

  // Обновляем статус
  const roleForUpdate: "chairman" | "secretary" | "accountant" | "admin" | undefined =
    role === "admin" ? "admin" : role === "chairman" || role === "secretary" ? role : undefined;
  updateBaseAppealStatus(id, params.status, roleForUpdate ?? "secretary");

  // Если есть комментарий, добавляем его
  if (params.comment && params.comment.trim()) {
    const normalizedRole = roleForUpdate ?? "secretary";
    addBaseAppealComment(id, normalizedRole === "admin" ? "admin" : normalizedRole, params.comment.trim());
  }

  // Записываем в ActivityLog (транзакционно вместе с обновлением статуса)
  // Sprint 2.3: используем appendActivity helper
  const { appendActivity } = await import("@/lib/activityLog");
  appendActivity("appeal", id, "status_changed", user.id ?? null, {
    oldStatus,
    newStatus: params.status,
    comment: params.comment && params.comment.trim() ? params.comment.trim() : null,
  });

  const updated = getBaseAppeal(id);
  if (!updated) {
    throw new Error("NOT_FOUND");
  }

  // Миграция Sprint 2.1: синхронизация assigneeUserId -> assignedToUserId
  const assignedToUserId = updated.assignedToUserId ?? updated.assigneeUserId ?? null;
  const assignedAt = updated.assignedAt ?? null;
  
  return {
    id: updated.id,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    title: updated.title,
    body: updated.body,
    status: updated.status,
    plotNumber: updated.plotNumber,
    authorId: updated.authorId,
    authorName: updated.authorName,
    authorPhone: updated.authorPhone,
    comments: updated.comments,
    assigneeRole: updated.assigneeRole,
    assigneeUserId: updated.assigneeUserId,
    assignedToUserId, // Sprint 2.1
    assignedAt,
    dueAt: updated.dueAt,
    priority: updated.priority,
    history: updated.history,
    replyDraft: updated.replyDraft,
  };
}

export async function addAppealComment(id: string, params: { text: string }): Promise<AppealComment> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";

  // Проверка прав через assertCan(role, action, entityType)
  assertCan(role, "appeal.comment", "appeal");

  const existingAppeal = getBaseAppeal(id);
  if (!existingAppeal) {
    throw new Error("NOT_FOUND");
  }

  const roleForComment: "chairman" | "secretary" | "accountant" | "admin" =
    role === "admin" ? "admin" : role === "chairman" || role === "secretary" || role === "accountant" ? role : "secretary";

  const updatedAppeal = addBaseAppealComment(id, roleForComment, params.text.trim());
  if (!updatedAppeal || !updatedAppeal.comments || updatedAppeal.comments.length === 0) {
    throw new Error("NOT_FOUND");
  }

  // Последний добавленный комментарий
  const comment = updatedAppeal.comments[0];

  // Записываем в ActivityLog
  // Sprint 2.3: используем appendActivity helper
  const { appendActivity } = await import("@/lib/activityLog");
  appendActivity("appeal", id, "comment_added", user.id ?? null, {
    commentId: comment.id,
    text: params.text.trim(),
  });

  return comment;
}

export async function getAppealActivity(id: string) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.read", "appeal");

  return getActivityLog("appeal", id);
}

export async function listByPlotId(plotId: string): Promise<Appeal[]> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.read", "appeal");

  // Ищем обращения, связанные с участком по plotNumber
  const plot = await import("@/server/services/plots").then((m) => m.getPlot(plotId));
  if (!plot) {
    return [];
  }

  const allAppeals = listBaseAppeals({});
  const plotNumber = plot.plotNumber;

  return allAppeals
    .filter((appeal) => {
      // Сравниваем plotNumber из обращения с plotNumber участка
      if (!appeal.plotNumber) return false;
      return appeal.plotNumber.toLowerCase().includes(plotNumber.toLowerCase()) ||
        plotNumber.toLowerCase().includes(appeal.plotNumber.toLowerCase());
    })
    .map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      title: item.title,
      body: item.body,
      status: item.status,
      plotNumber: item.plotNumber,
      authorId: item.authorId,
      authorName: item.authorName,
      authorPhone: item.authorPhone,
      comments: item.comments,
      assigneeRole: item.assigneeRole,
      assigneeUserId: item.assigneeUserId,
      assignedToUserId: item.assignedToUserId ?? item.assigneeUserId ?? null, // Sprint 2.1
      assignedAt: item.assignedAt ?? null,
      dueAt: item.dueAt,
      priority: item.priority,
      history: item.history,
    }));
}

export type ListInboxParams = {
  status?: AppealStatus | "overdue" | "due_soon";
  scope?: "mine" | "all";
  q?: string;
  sortBy?: "createdAt" | "dueAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
};

export type InboxItem = {
  id: string;
  title: string;
  plot?: string;
  author?: string;
  status: AppealStatus;
  assignedTo?: string;
  dueAt?: string | null;
  updatedAt: string;
  createdAt: string;
};

export async function listInbox(params: ListInboxParams = {}): Promise<InboxItem[]> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.read", "appeal");

  const { status, scope, q } = params;
  const now = new Date();

  // Проверяем просроченные обращения и отправляем уведомления (асинхронно, не блокируем)
  import("./notificationsOverdue")
    .then(({ checkAndNotifyOverdue }) => {
      checkAndNotifyOverdue().catch((error) => {
        console.error("[notifications] Failed to check overdue:", error);
      });
    })
    .catch(() => {
      // Игнорируем ошибки импорта
    });

  // Улучшенный поиск: по ID, теме, ФИО, телефону, участку
  let appeals = listBaseAppeals({ q: undefined }); // Получаем все для расширенного поиска
  
  // Поиск по q (если указан)
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    appeals = appeals.filter((appeal) => {
      // Поиск по ID
      if (appeal.id.toLowerCase().includes(query)) return true;
      // Поиск по теме
      if (appeal.title.toLowerCase().includes(query)) return true;
      // Поиск по ФИО
      if (appeal.authorName?.toLowerCase().includes(query)) return true;
      // Поиск по телефону
      if (appeal.authorPhone?.toLowerCase().includes(query)) return true;
      // Поиск по участку
      if (appeal.plotNumber?.toLowerCase().includes(query)) return true;
      // Поиск по тексту обращения
      if (appeal.body?.toLowerCase().includes(query)) return true;
      return false;
    });
  }

  // Фильтр по scope
  if (scope === "mine" && user.id) {
    appeals = appeals.filter((appeal) => appeal.assigneeUserId === user.id);
  }

  // Фильтр по статусу (исключая overdue и due_soon, которые обрабатываются отдельно)
  if (status && status !== "overdue" && status !== "due_soon") {
    appeals = appeals.filter((appeal) => appeal.status === status);
  }

  // Вычисление overdue: dueAt < now AND status != closed
  if (status === "overdue") {
    appeals = appeals.filter((appeal) => {
      if (appeal.status === "closed") return false;
      if (!appeal.dueAt) return false;
      return new Date(appeal.dueAt) < now;
    });
  }

  // Вычисление due_soon: dueAt <= now + 24h AND status != closed AND not overdue
  if (status === "due_soon") {
    const dueSoonThreshold = new Date(now);
    dueSoonThreshold.setHours(dueSoonThreshold.getHours() + 24);
    
    appeals = appeals.filter((appeal) => {
      if (appeal.status === "closed") return false;
      if (!appeal.dueAt) return false;
      const dueDate = new Date(appeal.dueAt);
      // due_soon: dueAt <= now + 24h AND dueAt > now (не overdue)
      return dueDate <= dueSoonThreshold && dueDate > now;
    });
  }

  // Сортировка
  const sortBy = params.sortBy || "updatedAt";
  const sortOrder = params.sortOrder || "desc";
  
  appeals = [...appeals].sort((a, b) => {
    let aValue: Date | number;
    let bValue: Date | number;
    
    if (sortBy === "createdAt") {
      aValue = new Date(a.createdAt).getTime();
      bValue = new Date(b.createdAt).getTime();
    } else if (sortBy === "dueAt") {
      aValue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      bValue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    } else {
      // updatedAt (по умолчанию)
      aValue = new Date(a.updatedAt).getTime();
      bValue = new Date(b.updatedAt).getTime();
    }
    
    const diff = aValue - bValue;
    return sortOrder === "asc" ? diff : -diff;
  });

  return appeals.map((item) => ({
    id: item.id,
    title: item.title,
    plot: item.plotNumber,
    author: item.authorName,
    status: item.status,
    assignedTo: item.assigneeUserId,
    dueAt: item.dueAt,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
  }));
}

export type InboxStats = {
  totalOpen: number; // Все открытые (не closed)
  myOpen: number; // Мои открытые (назначенные мне)
  dueSoon: number; // Скоро срок (в течение 24 часов)
  overdue: number; // Просрочено
};

/**
 * Эффективная агрегация счетчиков для inbox (без N+1)
 * Один проход по всем обращениям для подсчета всех метрик
 */
export async function getInboxStats(): Promise<InboxStats> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.read", "appeal");

  const now = new Date();
  const dueSoonThreshold = new Date(now);
  dueSoonThreshold.setHours(dueSoonThreshold.getHours() + 24);

  // Получаем все обращения одним запросом
  const appeals = listBaseAppeals({ q: undefined });

  // Агрегация за один проход
  let totalOpen = 0;
  let myOpen = 0;
  let dueSoon = 0;
  let overdue = 0;

  for (const appeal of appeals) {
    const isOpen = appeal.status !== "closed";
    const isMine = user.id && appeal.assigneeUserId === user.id;
    const dueDate = appeal.dueAt ? new Date(appeal.dueAt) : null;

    if (isOpen) {
      totalOpen++;
      if (isMine) {
        myOpen++;
      }
    }

    // Проверяем dueSoon и overdue только для открытых обращений
    if (isOpen && dueDate) {
      if (dueDate < now) {
        overdue++;
      } else if (dueDate <= dueSoonThreshold) {
        dueSoon++;
      }
    }
  }

  return {
    totalOpen,
    myOpen,
    dueSoon,
    overdue,
  };
}

export async function assignToMe(appealId: string): Promise<Appeal> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.assign", "appeal");

  const appeal = getBaseAppeal(appealId);
  if (!appeal) {
    throw new Error("NOT_FOUND");
  }

  const roleForAssign: "chairman" | "secretary" | "accountant" | "admin" =
    role === "admin" ? "admin" : role === "chairman" || role === "secretary" ? role : "secretary";

  // Sprint 2.1: назначаем только по userId (без роли)
  const updated = setAppealAssignee(appealId, undefined, user.id);
  if (!updated) {
    throw new Error("NOT_FOUND");
  }

  // Записываем в ActivityLog (транзакционно вместе с назначением)
  // Sprint 2.3: используем appendActivity helper
  const { appendActivity } = await import("@/lib/activityLog");
  appendActivity("appeal", appealId, "assigned", user.id, {
    from: null,
    to: user.id,
  });

  // Sprint 5.2: Триггер 2 - Назначено на меня (Telegram)
  try {
    const { triggerAppealAssigned } = await import("./appealsTelegram");
    await triggerAppealAssigned(updated, user.id);
  } catch (error) {
    // Игнорируем ошибки отправки уведомлений (не критично)
    if (process.env.NODE_ENV !== "production") {
      console.error("[appeals] Failed to send assignment notification:", error);
    }
  }

  // Sprint 7.1: Внутреннее уведомление о назначении
  try {
    const { notifyAppealAssigned } = await import("@/server/notifications/triggers");
    notifyAppealAssigned({
      appeal: updated,
      assignedToUserId: user.id,
      assignedToRole: undefined,
      previousAssigneeUserId: appeal.assignedToUserId ?? appeal.assigneeUserId ?? null,
      previousAssigneeRole: appeal.assigneeRole ?? null,
    });
  } catch (error) {
    // Игнорируем ошибки создания уведомлений (не критично)
    if (process.env.NODE_ENV !== "production") {
      console.error("[appeals] Failed to create internal notification:", error);
    }
  }

  return updated;
}

/**
 * Снять назначение с обращения
 */
export async function unassignAppeal(appealId: string): Promise<Appeal> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.assign", "appeal");

  const appeal = getBaseAppeal(appealId);
  if (!appeal) {
    throw new Error("NOT_FOUND");
  }

  // Проверка прав: только admin/chairman могут снимать назначения с других
  // Остальные могут снимать только со своих (Sprint 2.1: проверяем assignedToUserId)
  if (role !== "admin" && role !== "chairman") {
    const assignedToUserId = appeal.assignedToUserId ?? appeal.assigneeUserId ?? null;
    if (assignedToUserId !== user.id) {
      throw new Error("FORBIDDEN");
    }
  }

  const updated = setAppealAssignee(appealId, undefined, undefined);
  if (!updated) {
    throw new Error("NOT_FOUND");
  }

  // Записываем в ActivityLog (транзакционно вместе с снятием назначения)
  // Sprint 2.3: используем appendActivity helper
  const { appendActivity } = await import("@/lib/activityLog");
  appendActivity("appeal", appealId, "unassigned", user.id ?? null, {
    from: appeal.assignedToUserId ?? appeal.assigneeUserId ?? null,
    to: null,
  });

  return updated;
}

/**
 * Назначить обращение конкретному пользователю
 */
export async function assignToUser(appealId: string, targetUserId: string): Promise<Appeal> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.assign", "appeal");

  // Проверка прав: только admin/chairman могут назначать другим
  // Остальные могут назначать только себе
  if (role !== "admin" && role !== "chairman") {
    if (targetUserId !== user.id) {
      throw new Error("FORBIDDEN");
    }
  }

  const appeal = getBaseAppeal(appealId);
  if (!appeal) {
    throw new Error("NOT_FOUND");
  }

  // Sprint 2.1: назначаем только по userId (без роли)
  const updated = setAppealAssignee(appealId, undefined, targetUserId);
  if (!updated) {
    throw new Error("NOT_FOUND");
  }

  // Записываем в ActivityLog (транзакционно вместе с назначением)
  // Sprint 2.3: используем appendActivity helper
  const { appendActivity } = await import("@/lib/activityLog");
  appendActivity("appeal", appealId, "reassigned", user.id ?? null, {
    from: appeal.assignedToUserId ?? appeal.assigneeUserId ?? null,
    to: targetUserId,
  });

  // Sprint 5.2: Триггер 2 - Назначено на меня (если назначили на другого пользователя) (Telegram)
  if (targetUserId !== user.id) {
    try {
      const { triggerAppealAssigned } = await import("./appealsTelegram");
      await triggerAppealAssigned(updated, targetUserId);
    } catch (error) {
      // Игнорируем ошибки отправки уведомлений (не критично)
      if (process.env.NODE_ENV !== "production") {
        console.error("[appeals] Failed to send assignment notification:", error);
      }
    }
  }

  // Sprint 7.1: Внутреннее уведомление о переназначении
  try {
    const { notifyAppealAssigned } = await import("@/server/notifications/triggers");
    notifyAppealAssigned({
      appeal: updated,
      assignedToUserId: targetUserId,
      assignedToRole: undefined,
      previousAssigneeUserId: appeal.assignedToUserId ?? appeal.assigneeUserId ?? null,
      previousAssigneeRole: appeal.assigneeRole ?? null,
    });
  } catch (error) {
    // Игнорируем ошибки создания уведомлений (не критично)
    if (process.env.NODE_ENV !== "production") {
      console.error("[appeals] Failed to create internal notification:", error);
    }
  }

  return updated;
}

/**
 * Обновить тип обращения
 * Пересчитывает dueAt если dueAtSource === "auto"
 */
export async function updateAppealTypeService(
  appealId: string,
  type: AppealCategory
): Promise<Appeal | null> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.update", "appeal");

  const oldAppeal = getBaseAppeal(appealId);
  const updated = await updateAppealType(appealId, type);
  if (!updated) {
    return null;
  }

  // Логируем изменение типа (пользовательское действие)
  logActivity({
    actorUserId: user.id,
    actorRole: role,
    entityType: "appeal",
    entityId: appealId,
    action: "appeal.type_changed",
    meta: {
      oldType: oldAppeal?.type,
      newType: type,
      dueAtRecalculated: updated.dueAtSource === "auto",
      newDueAt: updated.dueAt,
    },
  });

  // Правила авто-триажа применяются внутри updateAppealType
  // и логируются там с actor=null

  return updated;
}

/**
 * Обновить приоритет обращения
 * Применяет правила авто-триажа при изменении приоритета
 */
export async function updateAppealPriorityService(
  appealId: string,
  priority: "low" | "medium" | "high"
): Promise<Appeal | null> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.update", "appeal");

  const oldAppeal = getBaseAppeal(appealId);
  const { updateAppealPriority } = await import("@/lib/appeals.store");
  const updated = await updateAppealPriority(appealId, priority);
  if (!updated) {
    return null;
  }

  // Логируем изменение приоритета (пользовательское действие)
  logActivity({
    actorUserId: user.id,
    actorRole: role,
    entityType: "appeal",
    entityId: appealId,
    action: "appeal.priority_changed",
    meta: {
      oldPriority: oldAppeal?.priority,
      newPriority: priority,
    },
  });

  // Правила авто-триажа применяются внутри updateAppealPriority
  // и логируются там с actor=null

  return updated;
}

/**
 * Назначить обращение роли
 */
export async function assignToRole(
  appealId: string,
  targetRole: "chairman" | "secretary" | "accountant" | "admin",
): Promise<Appeal> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "appeal.assign", "appeal");

  // Проверка прав: только admin/chairman могут назначать ролям
  if (role !== "admin" && role !== "chairman") {
    throw new Error("FORBIDDEN");
  }

  const appeal = getBaseAppeal(appealId);
  if (!appeal) {
    throw new Error("NOT_FOUND");
  }

  const updated = setAppealAssignee(appealId, targetRole, undefined);
  if (!updated) {
    throw new Error("NOT_FOUND");
  }

  // Записываем в ActivityLog (транзакционно вместе с назначением)
  logActivity({
    actorUserId: user.id ?? null,
    actorRole: role,
    entityType: "appeal",
    entityId: appealId,
    action: "reassigned",
    meta: {
      from: appeal.assigneeUserId || null,
      fromRole: appeal.assigneeRole || null,
      to: null,
      toRole: targetRole,
    },
  });

  // Sprint 7.1: Внутреннее уведомление о назначении роли
  try {
    const { notifyAppealAssigned } = await import("@/server/notifications/triggers");
    notifyAppealAssigned({
      appeal: updated,
      assignedToUserId: null,
      assignedToRole: targetRole,
      previousAssigneeUserId: appeal.assignedToUserId ?? appeal.assigneeUserId ?? null,
      previousAssigneeRole: appeal.assigneeRole ?? null,
    });
  } catch (error) {
    // Игнорируем ошибки создания уведомлений (не критично)
    if (process.env.NODE_ENV !== "production") {
      console.error("[appeals] Failed to create internal notification:", error);
    }
  }

  return updated;
}
