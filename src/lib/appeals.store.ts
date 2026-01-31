import type {
  Appeal,
  AppealStatus,
  AppealComment,
  AppealHistory,
  AppealMessage,
  OutboxItem,
  ResidentNotification,
} from "./office/types";
import { validateTransition } from "./appealsWorkflow";
import { calculateDueAt, calculateDueAtByType } from "./appealsSla";
import { calculateDueAtByType as calculateDueAtBySlaRules } from "@/config/slaRules";
import { logActivity } from "./activityLog.store";
import type { AppealCategory } from "./office/types";
import { triageAppeal } from "./appealsTriage";

export type { Appeal, AppealStatus };

const seedAppeals: Appeal[] = [
  {
    id: "a1",
    createdAt: "2024-01-10T09:00:00.000Z",
    updatedAt: "2024-01-12T14:30:00.000Z",
    title: "Уточнение начислений за январь",
    body: "Просьба сверить начисления за январь, кажется, включены лишние киловатты.",
    status: "in_progress",
    plotNumber: "Березовая, 12",
    authorName: "Анна Петрова",
    authorPhone: "+7 917 111-22-33",
    assigneeRole: "secretary",
    assignedToUserId: null, // Sprint 2.1
    assignedAt: null,
    dueAt: "2024-03-20T12:00:00.000Z",
    priority: "high",
    comments: [
      {
        id: "c1",
        createdAt: "2024-01-12T12:00:00.000Z",
        authorRole: "chairman",
        text: "Получили, проверяем начисления.",
      },
    ],
    history: [
      { id: "h1", createdAt: "2024-01-12T12:00:00.000Z", text: "Взято в работу", authorRole: "chairman" },
    ],
  },
  {
    id: "a2",
    createdAt: "2024-02-02T10:00:00.000Z",
    updatedAt: "2024-02-02T10:00:00.000Z",
    title: "Заявка на копию протокола",
    body: "Нужна копия протокола общего собрания за 2023 год.",
    status: "new",
    plotNumber: "Луговая, 7",
    authorName: "Сергей К.",
    priority: "medium",
    assignedToUserId: null, // Sprint 2.1
    assignedAt: null,
    comments: [],
  },
  {
    id: "a3",
    createdAt: "2024-02-15T08:30:00.000Z",
    updatedAt: "2024-02-18T12:45:00.000Z",
    title: "Передача показаний февраль",
    body: "Передаю показания счётчика 045678 за февраль.",
    status: "closed",
    plotNumber: "Сиреневая, 3",
    authorName: "Марина Л.",
    priority: "low",
    assignedToUserId: null, // Sprint 2.1
    assignedAt: null,
    comments: [
      {
        id: "c2",
        createdAt: "2024-02-18T10:00:00.000Z",
        authorRole: "secretary",
        text: "Показания внесли, начисление обновлено.",
      },
    ],
    history: [
      { id: "h2", createdAt: "2024-02-18T10:00:00.000Z", text: "Показания внесены", authorRole: "secretary" },
    ],
  },
  {
    id: "a4",
    createdAt: "2024-03-01T16:00:00.000Z",
    updatedAt: "2024-03-02T09:15:00.000Z",
    title: "Заявка на смену контактов",
    body: "Прошу поменять контактный номер телефона на +7 900 222-33-44.",
    status: "in_progress",
    plotNumber: "Лесная, 21",
    priority: "medium",
    assignedToUserId: null, // Sprint 2.1
    assignedAt: null,
    comments: [],
  },
  {
    id: "a5",
    createdAt: "2024-03-05T11:20:00.000Z",
    updatedAt: "2024-03-05T11:20:00.000Z",
    title: "Вопрос по доступу в кабинет",
    body: "Подскажите, нужен ли отдельный код для арендатора?",
    status: "new",
    plotNumber: "Речная, 5",
    authorName: "Иван П.",
    priority: "low",
    assignedToUserId: null, // Sprint 2.1
    assignedAt: null,
    comments: [],
  },
];

export type ListAppealsParams = {
  status?: AppealStatus;
  q?: string;
};

export function listAppeals(params: ListAppealsParams = {}): Appeal[] {
  const { status, q } = params;
  const query = q?.trim().toLowerCase();
  return seedAppeals
    .map((appeal) => {
      // Миграция Sprint 2.1: синхронизация assigneeUserId -> assignedToUserId
      // Если assignedToUserId не установлен, но есть assigneeUserId, синхронизируем
      let migratedAppeal = appeal;
      if (appeal.assignedToUserId === undefined && appeal.assigneeUserId !== undefined) {
        migratedAppeal = {
          ...appeal,
          assignedToUserId: appeal.assigneeUserId ?? null,
          assignedAt: appeal.assignedAt ?? null,
        };
      } else if (appeal.assignedToUserId === undefined) {
        migratedAppeal = {
          ...appeal,
          assignedToUserId: null,
          assignedAt: null,
        };
      }
      
      // Миграция: если у обращения нет dueAt, вычисляем его (без мутации исходных данных)
      if (!migratedAppeal.dueAt) {
        let category: AppealCategory = "general"; // Дефолт
        if (migratedAppeal.type) {
          category = migratedAppeal.type;
        } else {
          // Если тип не определен, вычисляем через triage
          const triage = triageAppeal(migratedAppeal);
          category = triage.category;
        }
        // Возвращаем новый объект с dueAt (не мутируем исходный)
        return {
          ...migratedAppeal,
          type: migratedAppeal.type || category,
          dueAt: calculateDueAtByType(category),
          dueAtSource: "auto" as const,
        };
      }
      return migratedAppeal;
    })
    .filter((appeal) => {
      if (status && appeal.status !== status) return false;
      if (query) {
        const haystack = `${appeal.title} ${appeal.body} ${appeal.authorName ?? ""} ${appeal.authorPhone ?? ""} ${
          appeal.plotNumber ?? ""
        }`.toLowerCase();
        return haystack.includes(query);
      }
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function listAppealsForResident(authorId: string): Appeal[] {
  if (!authorId) return [];
  return listAppeals().filter((appeal) => appeal.authorId === authorId);
}

export function getAppeal(id: string): Appeal | null {
  const found = seedAppeals.find((appeal) => appeal.id === id);
  if (!found) return null;
  
  // Миграция Sprint 2.1: синхронизация assigneeUserId -> assignedToUserId
  if (found.assignedToUserId === undefined && found.assigneeUserId !== undefined) {
    return {
      ...found,
      assignedToUserId: found.assigneeUserId ?? null,
      assignedAt: found.assignedAt ?? null,
    };
  } else if (found.assignedToUserId === undefined) {
    return {
      ...found,
      assignedToUserId: null,
      assignedAt: null,
    };
  }
  
  // Миграция: если у обращения нет типа, вычисляем его через triage
  let appeal = found;
  if (!appeal.type) {
    const triage = triageAppeal(appeal);
    appeal = { ...appeal, type: triage.category };
    
    // Если нет dueAt, вычисляем его на основе типа
    if (!appeal.dueAt) {
      appeal.dueAt = calculateDueAtByType(triage.category);
      appeal.dueAtSource = "auto"; // Автоматически установлен при миграции
    }
  }
  
  return {
    ...appeal,
    comments: appeal.comments ?? [],
    history: appeal.history ?? [],
  };
}

const appealMessages: AppealMessage[] = [];
const outbox: OutboxItem[] = [];
const residentNotifications: Array<ResidentNotification> = [];

export const listAppealMessages = (appealId: string): AppealMessage[] =>
  appealMessages
    .filter((m) => m.appealId === appealId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const sendAppealReplyToResident = (
  appealId: string,
  params: { text: string; channelPlanned: "site" | "email" | "telegram" },
  role: "chairman" | "secretary" | "accountant" | "admin",
) => {
  const appeal = getAppeal(appealId);
  if (!appeal) return null;
  const now = new Date().toISOString();
  const message: AppealMessage = {
    id: `m${Date.now().toString(36)}`,
    appealId,
    direction: "outbound",
    visibility: "resident",
    channel: "site",
    status: "sent",
    text: params.text,
    createdAt: now,
    createdByRole: role,
  };
  appealMessages.push(message);
  const historyEntry: AppealHistory = {
    id: `h${Date.now().toString(36)}`,
    createdAt: now,
    text: "Ответ отправлен жителю",
    authorRole: role,
  };
  appeal.history = [historyEntry, ...(appeal.history ?? [])];
  appeal.updatedAt = now;
  const outboxItem: OutboxItem = {
    id: `o${Date.now().toString(36)}`,
    kind: "appeal_reply",
    appealId,
    channelPlanned: params.channelPlanned,
    status: "pending",
    payload: { messageId: message.id, text: params.text },
    createdAt: now,
    updatedAt: now,
    attempts: 0,
  };
  outbox.push(outboxItem);
  return { message, outboxItem };
};

export const listOutbox = (status?: OutboxItem["status"]): OutboxItem[] => {
  const items = status ? outbox.filter((item) => item.status === status) : outbox.slice();
  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const retryFailedOutbox = (
  params: { limit?: number; maxAttempts?: number } = {},
): { retried: number } => {
  const limit = params.limit ?? 20;
  const maxAttempts = params.maxAttempts ?? 3;
  let retried = 0;
  outbox
    .filter((item) => item.status === "failed" && item.attempts < maxAttempts)
    .slice(0, limit)
    .forEach((item) => {
      const updated = markOutboxRetry(item.id);
      if (updated) retried += 1;
    });
  return { retried };
};

export const markOutboxRetry = (id: string): OutboxItem | null => {
  const idx = outbox.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const updated: OutboxItem = {
    ...outbox[idx],
    status: "pending",
    attempts: outbox[idx].attempts,
    lastError: undefined,
    updatedAt: new Date().toISOString(),
  };
  outbox[idx] = updated;
  return updated;
};

export const processOutbox = async ({
  limit = 20,
}: { limit?: number } = {}): Promise<{ processed: number; sent: number; failed: number }> => {
  const pending = outbox.filter((item) => item.status === "pending").slice(0, limit);
  let sent = 0;
  let failed = 0;

  for (const item of pending) {
    const now = new Date().toISOString();
    const message = appealMessages.find((m) => m.id === item.payload.messageId);
    if (!message) {
      failed += 1;
      Object.assign(item, {
        status: "failed",
        attempts: item.attempts + 1,
        updatedAt: now,
        lastError: "Message not found",
        lastAttemptAt: now,
      });
      continue;
    }

    const appeal = getAppeal(item.appealId);
    residentNotifications.push({
      id: `n${Date.now().toString(36)}${Math.random().toString(16).slice(2)}`,
      appealId: item.appealId,
      residentId: appeal?.authorId,
      plotId: undefined,
      title: `Ответ по обращению №${item.appealId}`,
      body: item.payload.text,
      createdAt: now,
    });

    if (item.channelPlanned === "telegram") {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_DEFAULT_CHAT_ID;
      if (!token || !chatId) {
        failed += 1;
        Object.assign(item, {
          status: "failed",
          attempts: item.attempts + 1,
          updatedAt: now,
          lastError: "Telegram is not configured",
          lastAttemptAt: now,
        });
        continue;
      }
      try {
        const { sendTelegramMessage } = await import("./notifications/telegram");
        const result = await sendTelegramMessage(chatId, item.payload.text);
        if (!result) {
          // Токен не настроен или другая ошибка
          Object.assign(item, {
            status: "failed",
            attempts: item.attempts + 1,
            updatedAt: now,
            lastError: "Telegram token not configured",
            lastAttemptAt: now,
          });
          continue;
        }
        sent += 1;
        Object.assign(item, {
          status: "sent",
          attempts: item.attempts + 1,
          updatedAt: now,
          lastError: undefined,
          lastAttemptAt: now,
          providerMessageId: result.providerMessageId,
        });
        continue;
      } catch (e) {
        failed += 1;
        Object.assign(item, {
          status: "failed",
          attempts: item.attempts + 1,
          updatedAt: now,
          lastError: e instanceof Error ? e.message : "Telegram send failed",
          lastAttemptAt: now,
        });
        continue;
      }
    }

    sent += 1;
    Object.assign(item, {
      status: "sent",
      attempts: item.attempts + 1,
      updatedAt: now,
      lastError: undefined,
      lastAttemptAt: now,
    });
  }

  return { processed: pending.length, sent, failed };
};

export const listResidentNotifications = (residentId: string): ResidentNotification[] =>
  residentNotifications
    .filter((n) => n.residentId === residentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const markNotificationRead = (id: string): ResidentNotification | null => {
  const idx = residentNotifications.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  const updated: ResidentNotification = { ...residentNotifications[idx], readAt: new Date().toISOString() };
  residentNotifications[idx] = updated;
  return updated;
};

export function setAppealStatus(id: string, status: AppealStatus): Appeal | null {
  const idx = seedAppeals.findIndex((appeal) => appeal.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const oldStatus = seedAppeals[idx].status;

  // Sprint 34: Set closedAt when status becomes closed, clear when reopened
  let closedAt = seedAppeals[idx].closedAt;
  if (status === "closed" && oldStatus !== "closed") {
    closedAt = now;
  } else if (status !== "closed" && oldStatus === "closed") {
    closedAt = null;
  }

  const updated: Appeal = {
    ...seedAppeals[idx],
    status,
    updatedAt: now,
    closedAt,
  };
  seedAppeals[idx] = updated;
  return updated;
}

export function addAppealComment(
  id: string,
  authorRole: "chairman" | "secretary" | "accountant" | "admin",
  text: string,
): Appeal | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const idx = seedAppeals.findIndex((appeal) => appeal.id === id);
  if (idx === -1) return null;
  const comment: AppealComment = {
    id: `c${Date.now()}${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    authorRole,
    text: trimmed,
  };
  const updated: Appeal = {
    ...seedAppeals[idx],
    updatedAt: comment.createdAt,
    comments: [comment, ...(seedAppeals[idx].comments ?? [])],
  };
  seedAppeals[idx] = updated;
  return updated;
}

export function updateAppealStatus(
  id: string,
  status: AppealStatus,
  updatedByRole?: "chairman" | "secretary" | "accountant" | "admin",
): Appeal | null {
  const appeal = getAppeal(id);
  if (!appeal) return null;

  // Валидация перехода статуса
  const validation = validateTransition(appeal.status, status);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid status transition");
  }

  const updated = setAppealStatus(id, status);
  if (updated) {
    // Обновляем dueAt при изменении статуса на основе SLA
    // Только если dueAtSource === "auto" (не пересчитываем ручные сроки)
    if (status !== "closed" && status !== appeal.status && updated.dueAtSource === "auto") {
      if (updated.type) {
        // Используем тип обращения для расчета dueAt (SLA v1)
        updated.dueAt = calculateDueAtByType(updated.type);
      } else {
        // Legacy: используем статус для обратной совместимости
        updated.dueAt = calculateDueAt(status);
      }
    }
    
    const historyEntry: AppealHistory = {
      id: `h${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      text: `Статус: ${status}`,
      authorRole: updatedByRole,
    };
    updated.history = [historyEntry, ...(updated.history ?? [])];
    
    // Sprint 5.2: Триггер 3 - Проверка просрочки после обновления статуса
    if (status !== "closed" && updated.dueAt) {
      // Проверяем просрочку асинхронно (не блокируем обновление статуса)
      (async () => {
        try {
          const { triggerAppealOverdue } = await import("@/server/services/appealsTelegram");
          await triggerAppealOverdue(updated);
        } catch (error) {
          // Игнорируем ошибки отправки уведомлений (не критично)
          if (process.env.NODE_ENV !== "production") {
            console.error("[appeals] Failed to check overdue notification:", error);
          }
        }
      })();
    }
  }
  return updated;
}

export async function createAppeal(input: {
  title: string;
  body: string;
  authorId?: string;
  authorName?: string;
  plotNumber?: string;
  authorPhone?: string;
  dueAt?: string; // Опционально: если передан вручную, используется он, иначе вычисляется по SLA
}): Promise<Appeal> {
  const now = new Date().toISOString();
  
  const newAppeal: Appeal = {
    id: `a${Date.now().toString(36)}`,
    createdAt: now,
    updatedAt: now,
    title: input.title,
    body: input.body,
    status: "new",
    authorId: input.authorId,
    authorName: input.authorName,
    plotNumber: input.plotNumber,
    authorPhone: input.authorPhone,
    comments: [],
    history: [{ id: `h${Date.now().toString(36)}`, createdAt: now, text: "Создано" }],
    assignedToUserId: null, // Sprint 2.1: назначение по userId
    assignedAt: null,
  };

  // Auto-triage: определяем категорию и назначаем исполнителя
  const triage = triageAppeal(newAppeal);
  
  // Сохраняем тип обращения (категорию) для SLA
  newAppeal.type = triage.category;
  
  // Назначаем исполнителя по категории
  if (triage.assigneeRole) {
    newAppeal.assigneeRole = triage.assigneeRole;
  }
  
  // Устанавливаем приоритет
  if (triage.priority) {
    newAppeal.priority = triage.priority;
  }

  // Если данных недостаточно, меняем статус на needs_info
  if (triage.needsInfo || triage.category === "insufficient_data") {
    newAppeal.status = "needs_info";
  }

  // Автоматически назначаем dueAt на основе типа обращения и SLA правил
  // Если dueAt не передан вручную, вычисляем по правилам SLA
  if (input.dueAt) {
    // Если dueAt передан вручную, используем его
    newAppeal.dueAt = input.dueAt;
    newAppeal.dueAtSource = "manual";
  } else {
    // Автоматически вычисляем dueAt по SLA правилам
    // triage.category всегда определен (triageAppeal всегда возвращает категорию)
    // calculateDueAtBySlaRules использует дефолт 72ч для неизвестных типов
    newAppeal.dueAt = calculateDueAtBySlaRules(triage.category);
    newAppeal.dueAtSource = "auto"; // Автоматически установлен по SLA
    
    // Sprint 7.3: Логируем sla.set когда dueAt назначается системой
    // Sprint 34: Также устанавливаем slaDays для отображения
    const { SLA_RULES, DEFAULT_SLA_HOURS, getSlaDays } = await import("@/config/slaRules");
    const slaHours = SLA_RULES[triage.category] ?? DEFAULT_SLA_HOURS;
    newAppeal.slaDays = getSlaDays(triage.category);
    
    logActivity({
      actorUserId: null,
      actorRole: null,
      entityType: "appeal",
      entityId: newAppeal.id,
      action: "sla.set",
      meta: {
        type: triage.category,
        dueAt: newAppeal.dueAt,
        dueAtSource: "auto",
        slaHours,
      },
    });
  }

  // Sprint 6.7: Применяем правила триажа через evaluateTriage
  try {
    const { evaluateTriage } = await import("@/server/triage/evaluateTriage");
    const { logTriageApplied } = await import("@/server/triage/logTriageActivity");
    const { calculateDueAtByType } = await import("./appealsSla");
    
    // Получаем контекст для триажа (канал, долг и т.д.)
    const triageContext: {
      channel?: "none" | "site" | "email" | "telegram";
      hasDebt?: boolean;
      debtAmount?: number;
    } = {
      channel: "site", // По умолчанию обращение создано через сайт
      hasDebt: false,
      debtAmount: 0,
    };
    
    // Если есть authorId, пытаемся получить информацию о долге
    if (input.authorId) {
      try {
        const { getUserFinanceInfo } = await import("@/lib/getUserFinanceInfo");
        const finance = await getUserFinanceInfo(input.authorId);
        const totalDebt = (finance.membershipDebt ?? 0) + (finance.electricityDebt ?? 0);
        triageContext.hasDebt = totalDebt > 0;
        triageContext.debtAmount = totalDebt;
      } catch (error) {
        // Игнорируем ошибки получения финансовой информации
        if (process.env.NODE_ENV !== "production") {
          console.error("[appeals] Failed to get finance info for triage:", error);
        }
      }
    }
    
    // Сохраняем состояние обращения до применения триажа
    const appealBefore = { ...newAppeal };
    
    // Оцениваем триаж (без логирования, логируем после применения)
    const triageResult = evaluateTriage(newAppeal, triageContext, { logActivity: false });
    
    // Применяем действия из результата триажа
    if (triageResult.matchedRuleId) {
      const actions = triageResult.actions;
      
      // Применяем assignRole
      if (actions.assignRole && !newAppeal.assignedToUserId) {
        newAppeal.assigneeRole = actions.assignRole;
      }
      
      // Применяем setStatus (только если статус ещё "new")
      if (actions.setStatus && newAppeal.status === "new") {
        newAppeal.status = actions.setStatus;
      }
      
      // Применяем setDueAtRule (только если dueAtSource="auto" или dueAt не установлен)
      if (actions.setDueAtRule !== undefined) {
        if (newAppeal.dueAtSource === "auto" || !newAppeal.dueAt) {
          const dueDate = new Date();
          dueDate.setHours(dueDate.getHours() + actions.setDueAtRule);
          newAppeal.dueAt = dueDate.toISOString();
          newAppeal.dueAtSource = "auto";
        }
      }
      
      // Проверяем, были ли реальные изменения после применения действий
      const hasChanges =
        (actions.assignRole && newAppeal.assigneeRole !== appealBefore.assigneeRole) ||
        (actions.setStatus && newAppeal.status !== appealBefore.status) ||
        (actions.setDueAtRule !== undefined && newAppeal.dueAt !== appealBefore.dueAt);
      
      if (hasChanges) {
        // Логируем triage.applied с изменениями
        logTriageApplied(appealBefore, triageResult, newAppeal);
      } else {
        // Если правило совпало, но изменений нет, логируем skipped
        const { logTriageSkipped } = await import("@/server/triage/logTriageActivity");
        logTriageSkipped(newAppeal, triageResult, "rule_matched_but_no_actions");
      }
    } else {
      // Ни одно правило не совпало, логируем skipped
      const { logTriageSkipped } = await import("@/server/triage/logTriageActivity");
      logTriageSkipped(newAppeal, triageResult, "no_rule_matched");
    }
  } catch (error) {
    // Игнорируем ошибки применения правил триажа (не критично)
    if (process.env.NODE_ENV !== "production") {
      console.error("[appeals] Failed to apply triage rules:", error);
    }
  }

  seedAppeals.unshift(newAppeal);

  // Логируем создание обращения
  // Sprint 2.3: используем appendActivity helper
  const { appendActivity } = await import("@/lib/activityLog");
  appendActivity("appeal", newAppeal.id, "created", input.authorId ?? null, {
    title: newAppeal.title,
    plotNumber: newAppeal.plotNumber,
    authorName: newAppeal.authorName,
    type: newAppeal.type,
    status: newAppeal.status,
  });

  // Sprint 5.2: Триггер 1 - Новое обращение создано
  try {
    const { triggerAppealCreated } = await import("@/server/services/appealsTelegram");
    await triggerAppealCreated(newAppeal);
  } catch (error) {
    // Игнорируем ошибки отправки уведомлений (не критично)
    if (process.env.NODE_ENV !== "production") {
      console.error("[appeals] Failed to send created notification:", error);
    }
  }

  // Логируем авто-действие в ActivityLog (system)
  logActivity({
    actorUserId: null,
    actorRole: "system",
    entityType: "appeal",
    entityId: newAppeal.id,
    action: "appeal.auto_triage",
    meta: {
      category: triage.category,
      assigneeRole: triage.assigneeRole,
      priority: triage.priority,
      needsInfo: triage.needsInfo,
    },
  });

  // Логируем автоматическое назначение (если было)
  if (triage.assigneeRole) {
    logActivity({
      actorUserId: null,
      actorRole: "system",
      entityType: "appeal",
      entityId: newAppeal.id,
      action: "appeal.assigned",
      meta: {
        assigneeRole: triage.assigneeRole,
        autoAssigned: true,
      },
    });
  }

  // Отправляем Telegram уведомление о новом обращении (асинхронно, не блокируем)
  // Используем динамический импорт чтобы избежать циклических зависимостей
  try {
    const { sendEvent } = await import("@/server/services/notifications");
    await sendEvent("appeal.created", {
      appealId: newAppeal.id,
      title: newAppeal.title,
      type: triage.category,
      plotNumber: newAppeal.plotNumber,
      authorName: newAppeal.authorName,
    });
  } catch (error) {
    // Игнорируем ошибки отправки уведомлений (не критично)
    if (process.env.NODE_ENV !== "production") {
      console.error("[appeals] Failed to send notification:", error);
    }
  }

  return newAppeal;
}

export function setAppealAssignee(
  id: string,
  assigneeRole?: "chairman" | "secretary" | "accountant" | "admin",
  assigneeUserId?: string,
): Appeal | null {
  const idx = seedAppeals.findIndex((appeal) => appeal.id === id);
  if (idx === -1) return null;
  const appeal = seedAppeals[idx];
  const now = new Date().toISOString();
  
  // Sprint 2.1: используем assignedToUserId вместо assigneeUserId
  // Если назначаем по userId, устанавливаем assignedToUserId и assignedAt
  // Если снимаем назначение (assigneeUserId undefined), очищаем assignedToUserId и assignedAt
  const assignedToUserId = assigneeUserId ?? null;
  const assignedAt = assignedToUserId ? now : null;
  
  const updated: Appeal = {
    ...appeal,
    assigneeRole, // Deprecated, но оставляем для обратной совместимости
    assigneeUserId, // Deprecated, но оставляем для обратной совместимости
    assignedToUserId, // Sprint 2.1: основное поле для назначения по userId
    assignedAt,
    updatedAt: now,
  };
  
  const historyText = assigneeRole && assigneeUserId
    ? `Назначено: ${assigneeRole} (${assigneeUserId})`
    : assigneeRole
    ? `Назначено роли: ${assigneeRole}`
    : assigneeUserId
    ? `Назначено пользователю: ${assigneeUserId}`
    : "Назначение снято";
  
  updated.history = [
    { id: `h${Date.now().toString(36)}`, createdAt: now, text: historyText, authorRole: assigneeRole },
    ...(appeal.history ?? []),
  ];
  seedAppeals[idx] = updated;

  // Примечание: логирование назначений происходит в сервисе (src/server/services/appeals.ts)
  // где есть доступ к текущему пользователю (actorUserId). Здесь только обновляем данные.

  // Отправляем событие о назначении (асинхронно)
  if (assigneeUserId || assigneeRole) {
    import("@/server/services/notifications")
      .then(({ sendEvent }) => {
        sendEvent("appeal.assigned", {
          appealId: id,
          title: appeal.title,
          assignedTo: assigneeUserId,
          assigneeRole,
        }).catch((error) => {
          console.error("[notifications] Failed to send appeal.assigned event:", error);
        });
      })
      .catch(() => {
        // Игнорируем ошибки импорта в dev
      });
  }

  // Sprint 5.2: Триггер 3 - Проверка просрочки после назначения
  if (updated.status !== "closed" && updated.dueAt) {
    // Проверяем просрочку асинхронно (не блокируем назначение)
    (async () => {
      try {
        const { triggerAppealOverdue } = await import("@/server/services/appealsTelegram");
        await triggerAppealOverdue(updated);
      } catch (error) {
        // Игнорируем ошибки отправки уведомлений (не критично)
        if (process.env.NODE_ENV !== "production") {
          console.error("[appeals] Failed to check overdue notification:", error);
        }
      }
    })();
  }

  return updated;
}

export function setAppealDue(
  id: string,
  dueAt: string | null,
  dueAtSource: "auto" | "manual" = "manual"
): Appeal | null {
  const idx = seedAppeals.findIndex((appeal) => appeal.id === id);
  if (idx === -1) return null;
  const updated: Appeal = {
    ...seedAppeals[idx],
    dueAt,
    dueAtSource, // Sprint 3.3: поддерживаем auto/manual
    updatedAt: new Date().toISOString(),
  };
  updated.history = [
    { id: `h${Date.now().toString(36)}`, createdAt: updated.updatedAt, text: `Срок: ${dueAt ?? "—"}` },
    ...(seedAppeals[idx].history ?? []),
  ];
  seedAppeals[idx] = updated;
  
  // Sprint 5.2: Триггер 3 - Проверка просрочки после установки/изменения dueAt
  if (updated.status !== "closed" && updated.dueAt) {
    // Проверяем просрочку асинхронно (не блокируем установку срока)
    (async () => {
      try {
        const { triggerAppealOverdue } = await import("@/server/services/appealsTelegram");
        await triggerAppealOverdue(updated);
      } catch (error) {
        // Игнорируем ошибки отправки уведомлений (не критично)
        if (process.env.NODE_ENV !== "production") {
          console.error("[appeals] Failed to check overdue notification:", error);
        }
      }
    })();
  }
  
  return updated;
}

/**
 * Обновляет тип обращения и пересчитывает dueAt если dueAtSource === "auto"
 * Также применяет правила авто-триажа при изменении типа
 */
export async function updateAppealType(id: string, type: AppealCategory): Promise<Appeal | null> {
  const idx = seedAppeals.findIndex((appeal) => appeal.id === id);
  if (idx === -1) return null;
  
  const appeal = seedAppeals[idx];
  const updated: Appeal = {
    ...appeal,
    type,
    updatedAt: new Date().toISOString(),
  };
  
  // Пересчитываем dueAt и slaDays только если он был установлен автоматически
  if (appeal.dueAtSource === "auto" && appeal.status !== "closed") {
    updated.dueAt = calculateDueAtByType(type);
    // Sprint 34: Пересчитываем slaDays
    const { getSlaDays } = await import("@/config/slaRules");
    updated.slaDays = getSlaDays(type);
    // dueAtSource остается "auto"
    
    // Sprint 5.2: Триггер 3 - Проверка просрочки после изменения типа (и пересчета dueAt)
    (async () => {
      try {
        const { triggerAppealOverdue } = await import("@/server/services/appealsTelegram");
        await triggerAppealOverdue(updated);
      } catch (error) {
        // Игнорируем ошибки отправки уведомлений (не критично)
        if (process.env.NODE_ENV !== "production") {
          console.error("[appeals] Failed to check overdue notification:", error);
        }
      }
    })();
  }
  
  // Sprint 6.2: Применяем правила авто-триажа при изменении типа (новый rule engine)
  // (только если назначение было автоматическим, не ручным)
  try {
    const { applyTriageRules } = await import("./triage/applyTriageRules");
    
    // Получаем контекст для правил
    const context: {
      channel?: "none" | "site" | "email" | "telegram";
      hasDebt?: boolean;
      debtAmount?: number;
    } = {
      channel: "site", // По умолчанию
      hasDebt: false,
      debtAmount: 0,
    };
    
    // Если есть authorId, пытаемся получить информацию о долге
    if (updated.authorId) {
      try {
        const { getUserFinanceInfo } = await import("@/lib/getUserFinanceInfo");
        const finance = await getUserFinanceInfo(updated.authorId);
        const totalDebt = (finance.membershipDebt ?? 0) + (finance.electricityDebt ?? 0);
        context.hasDebt = totalDebt > 0;
        context.debtAmount = totalDebt;
      } catch (error) {
        // Игнорируем ошибки получения финансовой информации
      }
    }
    
    // Применяем правила триажа
    const triageResult = applyTriageRules(updated, context);
    
    // Применяем изменения от правил (не перетираем ручные назначения и manual dueAt)
    if (triageResult.appliedRules.length > 0) {
      const ruleUpdated = triageResult.updatedAppeal;
      
      // Назначаем роль только если нет ручного назначения пользователем
      if (ruleUpdated.assigneeRole && !updated.assignedToUserId) {
        updated.assigneeRole = ruleUpdated.assigneeRole;
      }
      
      // Меняем статус только если статус ещё "new"
      if (ruleUpdated.status && updated.status === "new") {
        updated.status = ruleUpdated.status;
      }
      
      // Обновляем dueAt только если он был автоматическим
      if (ruleUpdated.dueAt && updated.dueAtSource === "auto") {
        updated.dueAt = ruleUpdated.dueAt;
        updated.dueAtSource = ruleUpdated.dueAtSource ?? "auto";
      }
      
      // Логируем каждое применённое правило (дедуп: только если есть изменения)
      for (const appliedRule of triageResult.appliedRules) {
        const changes = appliedRule.whatChanged;
        // Проверяем, что есть реальные изменения (дедуп)
        if (Object.keys(changes).length > 0) {
          logActivity({
            actorUserId: null,
            actorRole: null,
            entityType: "appeal",
            entityId: id,
            action: "system_rule_applied",
            meta: {
              ruleId: appliedRule.id,
              ruleTitle: appliedRule.title,
              changes,
              appealId: id,
            },
          });
        }
      }
    }
  } catch (error) {
    // Игнорируем ошибки применения правил (не критично)
    if (process.env.NODE_ENV !== "production") {
      console.error("[appeals] Failed to apply triage rules on type change:", error);
    }
  }
  
  updated.history = [
    { id: `h${Date.now().toString(36)}`, createdAt: updated.updatedAt, text: `Тип: ${type}` },
    ...(appeal.history ?? []),
  ];
  seedAppeals[idx] = updated;
  return updated;
}

/**
 * Обновляет приоритет обращения
 * Также применяет правила авто-триажа при изменении приоритета
 */
export async function updateAppealPriority(
  id: string,
  priority: "low" | "medium" | "high"
): Promise<Appeal | null> {
  const idx = seedAppeals.findIndex((appeal) => appeal.id === id);
  if (idx === -1) return null;
  
  const appeal = seedAppeals[idx];
  const updated: Appeal = {
    ...appeal,
    priority,
    updatedAt: new Date().toISOString(),
  };
  
  // Sprint 6.2: Применяем правила авто-триажа при изменении приоритета (новый rule engine)
  // (только если назначение было автоматическим, не ручным)
  try {
    const { applyTriageRules } = await import("./triage/applyTriageRules");
    
    // Получаем контекст для правил
    const context: {
      channel?: "none" | "site" | "email" | "telegram";
      hasDebt?: boolean;
      debtAmount?: number;
    } = {
      channel: "site", // По умолчанию
      hasDebt: false,
      debtAmount: 0,
    };
    
    // Если есть authorId, пытаемся получить информацию о долге
    if (updated.authorId) {
      try {
        const { getUserFinanceInfo } = await import("@/lib/getUserFinanceInfo");
        const finance = await getUserFinanceInfo(updated.authorId);
        const totalDebt = (finance.membershipDebt ?? 0) + (finance.electricityDebt ?? 0);
        context.hasDebt = totalDebt > 0;
        context.debtAmount = totalDebt;
      } catch (error) {
        // Игнорируем ошибки получения финансовой информации
      }
    }
    
    // Применяем правила триажа
    const triageResult = applyTriageRules(updated, context);
    
    // Применяем изменения от правил (не перетираем ручные назначения и manual dueAt)
    if (triageResult.appliedRules.length > 0) {
      const ruleUpdated = triageResult.updatedAppeal;
      
      // Назначаем роль только если нет ручного назначения пользователем
      if (ruleUpdated.assigneeRole && !updated.assignedToUserId) {
        updated.assigneeRole = ruleUpdated.assigneeRole;
      }
      
      // Меняем статус только если статус ещё "new"
      if (ruleUpdated.status && updated.status === "new") {
        updated.status = ruleUpdated.status;
      }
      
      // Обновляем dueAt только если он был автоматическим
      if (ruleUpdated.dueAt && updated.dueAtSource === "auto") {
        updated.dueAt = ruleUpdated.dueAt;
        updated.dueAtSource = ruleUpdated.dueAtSource ?? "auto";
      }
      
      // Логируем каждое применённое правило (дедуп: только если есть изменения)
      for (const appliedRule of triageResult.appliedRules) {
        const changes = appliedRule.whatChanged;
        // Проверяем, что есть реальные изменения (дедуп)
        if (Object.keys(changes).length > 0) {
          logActivity({
            actorUserId: null,
            actorRole: null,
            entityType: "appeal",
            entityId: id,
            action: "system_rule_applied",
            meta: {
              ruleId: appliedRule.id,
              ruleTitle: appliedRule.title,
              changes,
              appealId: id,
            },
          });
        }
      }
    }
  } catch (error) {
    // Игнорируем ошибки применения правил (не критично)
    if (process.env.NODE_ENV !== "production") {
      console.error("[appeals] Failed to apply triage rules on priority change:", error);
    }
  }
  
  updated.history = [
    { id: `h${Date.now().toString(36)}`, createdAt: updated.updatedAt, text: `Приоритет: ${priority}` },
    ...(appeal.history ?? []),
  ];
  seedAppeals[idx] = updated;
  return updated;
}
