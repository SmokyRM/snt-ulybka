import fs from "fs/promises";
import path from "path";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";

export type UserEventType =
  | "appeal_answered"
  | "appeal_status"
  | "finance_changed"
  | "electricity_reminder"
  | "doc_added";

export type UserEvent = {
  id: string;
  userId: string;
  createdAt: string;
  type: UserEventType;
  title: string;
  text: string;
  readAt: string | null;
};

const filePath = path.join(process.cwd(), "data", "user-events.json");

async function readEvents(): Promise<UserEvent[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as UserEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    if (isServerlessReadonlyFs()) {
      warnReadonlyFs("user-events:read-fallback");
      return [];
    }
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await writeEvents([]);
    return [];
  }
}

async function writeEvents(items: UserEvent[]) {
  if (isServerlessReadonlyFs()) {
    warnReadonlyFs("user-events:write");
    return;
  }
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function getUserEvents(userId: string, limit = 5): Promise<UserEvent[]> {
  if (!userId) return [];
  const events = await readEvents();
  return events
    .filter((e) => e.userId === userId)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, limit);
}

export async function markEventRead(userId: string, eventId: string): Promise<void> {
  if (!userId || !eventId) return;
  const events = await readEvents();
  const idx = events.findIndex((e) => e.id === eventId && e.userId === userId);
  if (idx === -1) return;
  events[idx] = { ...events[idx], readAt: new Date().toISOString() };
  await writeEvents(events);
}

export async function addUserEvent(
  event: Omit<UserEvent, "id" | "readAt" | "createdAt"> & { createdAt?: string },
): Promise<void> {
  if (!event.userId || !event.type || !event.title) return;
  const events = await readEvents();
  const item: UserEvent = {
    id: makeId(),
    userId: event.userId,
    createdAt: event.createdAt ?? new Date().toISOString(),
    type: event.type,
    title: event.title,
    text: event.text,
    readAt: null,
  };
  events.unshift(item);
  await writeEvents(events);
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!userId) return 0;
  const events = await readEvents();
  return events.filter((e) => e.userId === userId && e.readAt == null).length;
}

export async function markAllRead(userId: string): Promise<void> {
  if (!userId) return;
  const events = await readEvents();
  let changed = false;
  const now = new Date().toISOString();
  const updated = events.map((e) => {
    if (e.userId !== userId || e.readAt != null) return e;
    changed = true;
    return { ...e, readAt: now };
  });
  if (changed) await writeEvents(updated);
}
