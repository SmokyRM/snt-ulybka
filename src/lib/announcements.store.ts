import { randomUUID } from "crypto";

export type AnnouncementStatus = "draft" | "published";
export type AnnouncementAudience = "all" | "residents" | "staff";

export type Announcement = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
  authorRole: string;
  audience: AnnouncementAudience;
};

type ListParams = {
  status?: AnnouncementStatus | "all";
  audience?: AnnouncementAudience;
  q?: string | null;
};

const seed: Announcement[] = [
  {
    id: "an1",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    title: "Отключение электроэнергии",
    body: "Плановое отключение завтра с 10:00 до 12:00.",
    status: "published",
    authorRole: "chairman",
    audience: "all",
  },
  {
    id: "an2",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    title: "Собрание правления",
    body: "Правление собирается в пятницу. Повестка: финансы, документы.",
    status: "draft",
    authorRole: "secretary",
    audience: "staff",
  },
  {
    id: "an3",
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    title: "Подача показаний",
    body: "Приём показаний до 25 числа месяца. Просьба передать заранее.",
    status: "published",
    authorRole: "chairman",
    audience: "residents",
  },
  {
    id: "an4",
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    title: "Реквизиты обновлены",
    body: "Уточнены реквизиты для оплаты взносов. Проверьте раздел Документы.",
    status: "published",
    authorRole: "accountant",
    audience: "all",
  },
  {
    id: "an5",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    title: "Уборка территории",
    body: "Запланирована уборка территории в выходные. Просьба убрать стройматериалы.",
    status: "draft",
    authorRole: "chairman",
    audience: "residents",
  },
];

let db: Announcement[] = [...seed];

export function listAnnouncements(params: ListParams = {}): Announcement[] {
  const { status, audience, q } = params;
  let items = [...db];
  if (status && status !== "all") {
    items = items.filter((item) => item.status === status);
  }
  if (audience) {
    items = items.filter((item) => item.audience === audience || item.audience === "all");
  }
  if (q) {
    const query = q.toLowerCase();
    items = items.filter(
      (item) => item.title.toLowerCase().includes(query) || item.body.toLowerCase().includes(query),
    );
  }
  return items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getAnnouncement(id: string): Announcement | null {
  return db.find((item) => item.id === id) ?? null;
}

export function createAnnouncement(input: {
  title: string;
  body: string;
  authorRole: string;
  audience: AnnouncementAudience;
}): Announcement {
  const now = new Date().toISOString();
  const item: Announcement = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "draft",
    ...input,
  };
  db = [item, ...db];
  return item;
}

export function togglePublish(id: string): Announcement | null {
  const idx = db.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const nextStatus: AnnouncementStatus = db[idx].status === "published" ? "draft" : "published";
  db[idx] = { ...db[idx], status: nextStatus, updatedAt: new Date().toISOString() };
  return db[idx];
}

export function updateAnnouncement(
  id: string,
  data: Partial<Pick<Announcement, "title" | "body" | "audience">>,
): Announcement | null {
  const idx = db.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  db[idx] = { ...db[idx], ...data, updatedAt: new Date().toISOString() };
  return db[idx];
}

export function removeAnnouncement(id: string): boolean {
  const prev = db.length;
  db = db.filter((item) => item.id !== id);
  return db.length < prev;
}
