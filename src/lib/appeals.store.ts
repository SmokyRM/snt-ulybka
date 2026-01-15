import type {
  Appeal,
  AppealStatus,
  AppealComment,
  AppealHistory,
  AppealMessage,
  OutboxItem,
  ResidentNotification,
} from "./office/types";

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
    comments: [],
  },
  {
    id: "a3",
    createdAt: "2024-02-15T08:30:00.000Z",
    updatedAt: "2024-02-18T12:45:00.000Z",
    title: "Передача показаний февраль",
    body: "Передаю показания счётчика 045678 за февраль.",
    status: "done",
    plotNumber: "Сиреневая, 3",
    authorName: "Марина Л.",
    priority: "low",
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

export function getAppeal(id: string): Appeal | null {
  const found = seedAppeals.find((appeal) => appeal.id === id);
  if (!found) return null;
  return {
    ...found,
    comments: found.comments ?? [],
    history: found.history ?? [],
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
        const result = await sendTelegramMessage({ token, chatId, text: item.payload.text });
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
  const updated: Appeal = {
    ...seedAppeals[idx],
    status,
    updatedAt: new Date().toISOString(),
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
  const updated = setAppealStatus(id, status);
  if (updated) {
    const historyEntry: AppealHistory = {
      id: `h${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      text: `Статус: ${status}`,
      authorRole: updatedByRole,
    };
    updated.history = [historyEntry, ...(updated.history ?? [])];
  }
  return updated;
}

export function createAppeal(input: {
  title: string;
  body: string;
  authorId?: string;
  authorName?: string;
  plotNumber?: string;
  authorPhone?: string;
}): Appeal {
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
  };
  seedAppeals.unshift(newAppeal);
  return newAppeal;
}

export function setAppealAssignee(
  id: string,
  assigneeRole?: "chairman" | "secretary" | "accountant" | "admin",
  assigneeUserId?: string,
): Appeal | null {
  const idx = seedAppeals.findIndex((appeal) => appeal.id === id);
  if (idx === -1) return null;
  const updated: Appeal = {
    ...seedAppeals[idx],
    assigneeRole,
    assigneeUserId,
    updatedAt: new Date().toISOString(),
  };
  updated.history = [
    { id: `h${Date.now().toString(36)}`, createdAt: updated.updatedAt, text: `Назначено: ${assigneeRole ?? "—"}`, authorRole: assigneeRole },
    ...(seedAppeals[idx].history ?? []),
  ];
  seedAppeals[idx] = updated;
  return updated;
}

export function setAppealDue(id: string, dueAt: string | null): Appeal | null {
  const idx = seedAppeals.findIndex((appeal) => appeal.id === id);
  if (idx === -1) return null;
  const updated: Appeal = {
    ...seedAppeals[idx],
    dueAt,
    updatedAt: new Date().toISOString(),
  };
  updated.history = [
    { id: `h${Date.now().toString(36)}`, createdAt: updated.updatedAt, text: `Срок: ${dueAt ?? "—"}` },
    ...(seedAppeals[idx].history ?? []),
  ];
  seedAppeals[idx] = updated;
  return updated;
}
