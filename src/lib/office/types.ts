export type AppealStatus = "new" | "in_progress" | "needs_info" | "closed";

export type AppealComment = {
  id: string;
  createdAt: string;
  authorRole: "chairman" | "secretary" | "accountant" | "admin";
  text: string;
};

export type AppealHistory = {
  id: string;
  createdAt: string;
  text: string;
  authorRole?: "chairman" | "secretary" | "accountant" | "admin";
};

export type AppealCategory = 
  | "finance"
  | "electricity"
  | "documents"
  | "access"
  | "membership"
  | "insufficient_data"
  | "general";

export type Appeal = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  body: string;
  status: AppealStatus;
  type?: AppealCategory; // Тип обращения (категория из triage) для SLA
  plotNumber?: string;
  authorId?: string;
  authorName?: string;
  authorPhone?: string;
  assigneeRole?: "chairman" | "secretary" | "accountant" | "admin"; // Deprecated: используйте assignedToUserId
  assigneeUserId?: string; // Deprecated: используйте assignedToUserId
  assignedToUserId: string | null; // ID назначенного пользователя (Sprint 2.1)
  assignedAt: string | null; // Дата и время назначения
  dueAt?: string | null;
  dueAtSource?: "auto" | "manual"; // Источник установки срока: auto - автоматически по SLA, manual - вручную
  priority?: "low" | "medium" | "high";
  comments?: AppealComment[];
  history?: AppealHistory[];
  replyDraft?: { text: string; category: string; tone: string; updatedAt: string };
};

export type AppealMessage = {
  id: string;
  appealId: string;
  direction: "outbound" | "inbound";
  visibility: "resident" | "internal";
  channel: "none" | "site" | "email" | "telegram";
  status: "draft" | "sent" | "failed";
  text: string;
  createdAt: string;
  createdByRole: string;
};

export type OutboxItem = {
  id: string;
  kind: "appeal_reply";
  appealId: string;
  channelPlanned: "site" | "email" | "telegram";
  status: "pending" | "sent" | "failed";
  payload: { messageId: string; text: string };
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: string;
  providerMessageId?: string;
};

export type ResidentNotification = {
  id: string;
  appealId: string;
  plotId?: string;
  residentId?: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
};

export type AnnouncementStatus = "draft" | "published";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  authorRole?: string;
};

export type Plot = {
  id: string;
  number: string;
  ownerName?: string;
  phone?: string;
  address?: string;
};

export type DebtRow = {
  plotNumber: string;
  ownerName?: string;
  period: string;
  accrued: number;
  paid: number;
  debt: number;
};

/**
 * Sprint 5.4: Шаблон действия/ответа для обращений
 */
export type Template = {
  id: string;
  key: string; // unique key
  title: string;
  body: string; // текст шаблона
  allowedRoles: string[]; // массив ролей, которым разрешено использовать
  actions: {
    setStatus?: AppealStatus; // изменить статус
    assignRole?: "chairman" | "secretary" | "accountant" | "admin"; // назначить роль
    addComment?: boolean; // добавить комментарий (если true, используется body)
  };
  createdAt: string;
  updatedAt: string;
};
