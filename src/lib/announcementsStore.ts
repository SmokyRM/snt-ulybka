import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type AnnouncementStatus = "draft" | "published";
export type AnnouncementAudience = "all" | "debtors";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
  isImportant: boolean;
  audience: AnnouncementAudience;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

type SaveInput = Omit<Announcement, "id" | "createdAt" | "updatedAt" | "publishedAt"> & {
  publishedAt?: string | null;
};

const DATA_PATH = path.join(process.cwd(), "data", "announcements.json");

async function ensureFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, "[]", "utf8");
  }
}

async function readAll(): Promise<Announcement[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_PATH, "utf8").catch(() => "[]");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Announcement[];
  } catch {
    // fallthrough
  }
  return [];
}

async function writeAll(items: Announcement[]) {
  await ensureFile();
  await fs.writeFile(DATA_PATH, JSON.stringify(items, null, 2), "utf8");
}

export async function listAnnouncements(includeDrafts = false): Promise<Announcement[]> {
  const items = await readAll();
  return items
    .filter((item) => (includeDrafts ? true : item.status === "published"))
    .sort((a, b) => {
      const aDate = a.publishedAt || a.updatedAt;
      const bDate = b.publishedAt || b.updatedAt;
      return bDate.localeCompare(aDate);
    });
}

export async function listPublishedForAudience(hasDebt: boolean): Promise<Announcement[]> {
  const items = await listAnnouncements(false);
  return items.filter((item) => item.audience === "all" || (item.audience === "debtors" && hasDebt));
}

export async function createAnnouncement(data: SaveInput): Promise<Announcement> {
  const now = new Date().toISOString();
  const item: Announcement = {
    id: randomUUID(),
    title: data.title,
    body: data.body,
    status: data.status,
    isImportant: data.isImportant,
    audience: data.audience,
    publishedAt: data.status === "published" ? now : null,
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy,
  };
  const items = await readAll();
  items.push(item);
  await writeAll(items);
  return item;
}

export async function updateAnnouncement(
  id: string,
  patch: Partial<SaveInput>,
): Promise<Announcement | null> {
  const items = await readAll();
  const idx = items.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const prev = items[idx];
  const next: Announcement = {
    ...prev,
    ...patch,
    publishedAt:
      patch.status === "published"
        ? prev.publishedAt ?? now
        : patch.status
          ? null
          : prev.publishedAt,
    updatedAt: now,
  };
  items[idx] = next;
  await writeAll(items);
  return next;
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const items = await readAll();
  return items.find((a) => a.id === id) ?? null;
}
