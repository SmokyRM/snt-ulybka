import fs from "fs/promises";
import path from "path";
import { addUserEvent } from "@/lib/userEvents";

export type AppealStatus = "new" | "in_progress" | "answered";

export type Appeal = {
  id: string;
  userId: string;
  createdAt: string;
  text: string;
  status: AppealStatus;
  adminReply: string | null;
};

const filePath = path.join(process.cwd(), "data", "appeals.json");

async function readAppeals(): Promise<Appeal[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Appeal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await writeAppeals([]);
    return [];
  }
}

async function writeAppeals(items: Appeal[]) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function createAppeal(userId: string, text: string) {
  if (!userId || !text.trim()) return;
  const appeals = await readAppeals();
  const now = new Date().toISOString();
  const item: Appeal = {
    id: makeId(),
    userId,
    createdAt: now,
    text: text.trim(),
    status: "new",
    adminReply: null,
  };
  appeals.unshift(item);
  await writeAppeals(appeals);
  return item;
}

export async function getUserAppeals(userId: string) {
  if (!userId) return [];
  const appeals = await readAppeals();
  return appeals.filter((a) => a.userId === userId);
}

export async function getAllAppeals() {
  return readAppeals();
}

export async function updateAppealStatus(id: string, status: AppealStatus, adminReply?: string) {
  if (!id || !status) return;
  const appeals = await readAppeals();
  const idx = appeals.findIndex((a) => a.id === id);
  if (idx === -1) return;
  appeals[idx] = {
    ...appeals[idx],
    status,
    adminReply: typeof adminReply === "string" ? adminReply : appeals[idx].adminReply,
  };
  await writeAppeals(appeals);
  if (status === "answered") {
    await addUserEvent({
      userId: appeals[idx].userId,
      type: "appeal_answered",
      title: "Ответ по обращению",
      text: adminReply && adminReply.trim().length > 0 ? adminReply : "Обращение отмечено как отвеченное",
    });
  }
  return appeals[idx];
}
