import fs from "fs/promises";
import path from "path";
import { addUserEvent } from "@/lib/userEvents";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";
import { rateLimit } from "@/lib/security/rateLimit";

export type AppealStatus = "draft" | "new" | "in_progress" | "answered" | "closed";
export type AppealTopic = string;
export const APPEAL_TOPICS: AppealTopic[] = [
  "Общее",
  "Доступ/код",
  "Взносы и оплата",
  "Электроэнергия",
  "Документы",
  "Другое",
];

export type Appeal = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  topic: AppealTopic;
  message: string;
  status: AppealStatus;
  adminReply: string | null;
  updatedBy?: string | null;
  updatedByRole?: string | null;
  statusUpdatedAt?: string | null;
  repliedAt?: string | null;
  unreadByUser?: boolean;
};

const filePath = path.join(process.cwd(), "data", "appeals.json");

const normalizeAppeal = (raw: unknown): Appeal => {
  const fallback = {
    id: "",
    userId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    topic: "Общее",
    message: "",
    status: "new" as AppealStatus,
    adminReply: null,
  };
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  const created = typeof obj.createdAt === "string" ? obj.createdAt : fallback.createdAt;
  return {
    id: typeof obj.id === "string" ? obj.id : fallback.id,
    userId: typeof obj.userId === "string" ? obj.userId : fallback.userId,
    createdAt: created,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : created,
    topic: typeof obj.topic === "string" && obj.topic.trim() ? obj.topic : "Общее",
    message:
      typeof obj.message === "string"
        ? obj.message
        : typeof obj.text === "string"
          ? obj.text
          : "",
    status:
      obj.status === "in_progress" ||
      obj.status === "answered" ||
      obj.status === "closed" ||
      obj.status === "draft" ||
      obj.status === "new"
        ? (obj.status as AppealStatus)
        : "new",
    adminReply: typeof obj.adminReply === "string" ? obj.adminReply : null,
    updatedBy: typeof obj.updatedBy === "string" ? obj.updatedBy : null,
    updatedByRole: typeof obj.updatedByRole === "string" ? obj.updatedByRole : null,
    statusUpdatedAt:
      typeof obj.statusUpdatedAt === "string" ? obj.statusUpdatedAt : created,
    repliedAt: typeof obj.repliedAt === "string" ? obj.repliedAt : null,
    unreadByUser: typeof obj.unreadByUser === "boolean" ? obj.unreadByUser : false,
  };
};

async function readAppeals(): Promise<Appeal[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Appeal[];
    const normalized = Array.isArray(parsed) ? parsed.map(normalizeAppeal) : [];
    return normalized.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  } catch {
    if (isServerlessReadonlyFs()) {
      warnReadonlyFs("appeals:read-fallback");
      return [];
    }
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await writeAppeals([]);
    return [];
  }
}

async function writeAppeals(items: Appeal[]) {
  if (isServerlessReadonlyFs()) {
    warnReadonlyFs("appeals:write");
    return;
  }
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function checkAppealRateLimit(userId: string) {
  const result = await rateLimit(`appeal:${userId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  return result;
}

export async function createAppeal(userId: string, message: string, topic: AppealTopic = "Общее") {
  if (!userId || !message.trim()) return;
  const appeals = await readAppeals();
  const now = new Date().toISOString();
  const item: Appeal = {
    id: makeId(),
    userId,
    createdAt: now,
    updatedAt: now,
    topic: topic.trim() || "Общее",
    message: message.trim(),
    status: "new",
    adminReply: null,
    updatedBy: userId,
    updatedByRole: null,
    statusUpdatedAt: now,
    repliedAt: null,
    unreadByUser: false,
  };
  appeals.unshift(item);
  await writeAppeals(appeals);
  return item;
}

export async function getAppealById(id: string) {
  if (!id) return null;
  const appeals = await readAppeals();
  return appeals.find((a) => a.id === id) ?? null;
}

export async function getUserAppeals(userId: string) {
  if (!userId) return [];
  const appeals = await readAppeals();
  return appeals.filter((a) => a.userId === userId);
}

export async function getAllAppeals() {
  return readAppeals();
}

export async function updateAppealStatus(
  id: string,
  status: AppealStatus,
  adminReply?: string,
  updatedBy?: { id?: string | null; role?: string | null },
): Promise<Appeal | undefined> {
  if (!id || !status) return;
  const appeals = await readAppeals();
  const idx = appeals.findIndex((a) => a.id === id);
  if (idx === -1) return;
  const now = new Date().toISOString();
  const prevReply = appeals[idx].adminReply ?? "";
  const replyTrimmed = typeof adminReply === "string" ? adminReply.trim() : "";
  const isReplyChanged =
    typeof adminReply === "string" && replyTrimmed.length > 0 && replyTrimmed !== prevReply;

  appeals[idx] = {
    ...appeals[idx],
    status,
    updatedAt: now,
    adminReply: typeof adminReply === "string" ? adminReply : appeals[idx].adminReply,
    updatedBy: updatedBy?.id ?? appeals[idx].updatedBy ?? null,
    updatedByRole: updatedBy?.role ?? appeals[idx].updatedByRole ?? null,
    statusUpdatedAt: now,
    repliedAt: isReplyChanged || status === "answered" ? now : appeals[idx].repliedAt ?? null,
    unreadByUser: isReplyChanged || status === "answered" ? true : appeals[idx].unreadByUser ?? false,
  };
  await writeAppeals(appeals);
  if (status === "answered") {
    await addUserEvent({
      userId: appeals[idx].userId,
      type: "appeal_answered",
      title: "Ответ по обращению",
      text:
        adminReply && adminReply.trim().length > 0
          ? adminReply
          : "Обращение отмечено как отвеченное",
    });
  }
  return appeals[idx];
}

export async function markAppealRead(id: string, userId: string): Promise<Appeal | undefined> {
  if (!id || !userId) return;
  const appeals = await readAppeals();
  const idx = appeals.findIndex((a) => a.id === id && a.userId === userId);
  if (idx === -1) return;
  if (!appeals[idx].unreadByUser) return appeals[idx];
  appeals[idx] = {
    ...appeals[idx],
    unreadByUser: false,
    updatedAt: new Date().toISOString(),
  };
  await writeAppeals(appeals);
  return appeals[idx];
}
