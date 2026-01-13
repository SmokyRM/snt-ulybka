import { randomUUID } from "node:crypto";

export type OfficeAnnouncementStatus = "draft" | "published";

export type OfficeAnnouncement = {
  id: string;
  title: string;
  body: string;
  status: OfficeAnnouncementStatus;
  createdAt: string;
  updatedAt: string;
  authorRole: string;
};

type CreateInput = {
  title: string;
  body: string;
  status?: OfficeAnnouncementStatus;
  authorRole?: string;
};

type UpdateInput = {
  title?: string;
  body?: string;
  status?: OfficeAnnouncementStatus;
};

let announcements: OfficeAnnouncement[] = [
  {
    id: randomUUID(),
    title: "Проверка показаний электроэнергии",
    body: "Соберите показания до 20 числа и передайте через кабинет. Если есть вопросы — пишите в офис.",
    status: "published",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    authorRole: "chairman",
  },
  {
    id: randomUUID(),
    title: "Заседание правления",
    body: "Следующее заседание состоится в субботу в 12:00. Приём обращений заранее.",
    status: "published",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    authorRole: "secretary",
  },
  {
    id: randomUUID(),
    title: "Черновик объявления",
    body: "Черновик для будущей публикации.",
    status: "draft",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    authorRole: "chairman",
  },
  {
    id: randomUUID(),
    title: "Субботник в СНТ",
    body: "Приглашаем жителей на субботник в эту пятницу. Сбор у въезда в 11:00.",
    status: "published",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    authorRole: "chairman",
  },
  {
    id: randomUUID(),
    title: "Информация по реквизитам",
    body: "Напоминаем реквизиты СНТ для оплаты взносов. Детали в разделе Документы.",
    status: "published",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    authorRole: "accountant",
  },
];

export const listOfficeAnnouncements = (filters: { q?: string; status?: OfficeAnnouncementStatus }) => {
  const q = filters.q?.trim().toLowerCase() ?? "";
  return announcements
    .filter((item) => {
      if (filters.status && item.status !== filters.status) return false;
      if (!q) return true;
      const haystack = `${item.title} ${item.body}`.toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getOfficeAnnouncement = (id: string): OfficeAnnouncement | null =>
  announcements.find((item) => item.id === id) ?? null;

export const createOfficeAnnouncement = (data: CreateInput): OfficeAnnouncement => {
  const now = new Date().toISOString();
  const item: OfficeAnnouncement = {
    id: randomUUID(),
    title: data.title,
    body: data.body,
    status: data.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    authorRole: data.authorRole ?? "chairman",
  };
  announcements = [item, ...announcements];
  return item;
};

export const updateOfficeAnnouncement = (
  id: string,
  data: UpdateInput,
): OfficeAnnouncement | null => {
  const idx = announcements.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const updated: OfficeAnnouncement = {
    ...announcements[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  announcements[idx] = updated;
  return updated;
};

export const setOfficeAnnouncementStatus = (
  id: string,
  status: OfficeAnnouncementStatus,
): OfficeAnnouncement | null => updateOfficeAnnouncement(id, { status });
