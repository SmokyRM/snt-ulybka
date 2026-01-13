import { randomUUID } from "crypto";

export type AppealStatus = "new" | "in_progress" | "closed";

export type Appeal = {
  id: string;
  title: string;
  body: string;
  status: AppealStatus;
  createdAt: string;
  updatedAt: string;
  authorName?: string;
  authorId?: string;
  comments?: { id: string; text: string; createdAt: string; author?: string }[];
};

type ListParams = {
  status?: AppealStatus | "all";
  q?: string | null;
  authorId?: string | null;
};

const seed: Appeal[] = [
  {
    id: "a1",
    title: "Проблема с освещением",
    body: "Не горит свет у въезда, просьба починить.",
    status: "new",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    authorName: "Иван Петров",
    authorId: "user-resident-default",
    comments: [],
  },
  {
    id: "a2",
    title: "Счет за электроэнергию",
    body: "Прошу уточнить начисление за январь.",
    status: "in_progress",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    authorName: "Мария Смирнова",
    authorId: "user-resident-default",
    comments: [{ id: "c1", text: "В работе у бухгалтера", createdAt: new Date(Date.now() - 86400000).toISOString() }],
  },
  {
    id: "a3",
    title: "Выписка из реестра",
    body: "Нужна выписка для продажи участка.",
    status: "closed",
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    authorName: "Олег Иванов",
    authorId: "user-resident-default",
    comments: [{ id: "c2", text: "Выписка отправлена на почту", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() }],
  },
];

let db: Appeal[] = [...seed];

export function listAppeals(params: ListParams = {}): Appeal[] {
  const { status, q, authorId } = params;
  let items = [...db];
  if (status && status !== "all") {
    items = items.filter((item) => item.status === status);
  }
  if (authorId) {
    items = items.filter((item) => item.authorId === authorId);
  }
  if (q) {
    const query = q.toLowerCase();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.body.toLowerCase().includes(query) ||
        (item.authorName?.toLowerCase().includes(query) ?? false)
    );
  }
  return items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getAppeal(id: string): Appeal | null {
  const found = db.find((item) => item.id === id);
  if (found) return found;
  // Если не найден, но это seed ID - гарантируем что seed данные есть
  const seedItem = seed.find((item) => item.id === id);
  if (seedItem) {
    // Восстанавливаем seed элемент если он был потерян
    const existing = db.find((item) => item.id === id);
    if (!existing) {
      db.push({ ...seedItem });
      return { ...seedItem };
    }
  }
  return null;
}

export function updateAppealStatus(id: string, status: AppealStatus): Appeal | null {
  const idx = db.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  db[idx] = { ...db[idx], status, updatedAt: new Date().toISOString() };
  return db[idx];
}

export function addAppealComment(id: string, text: string, author?: string): Appeal | null {
  const idx = db.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const clean = text.trim();
  if (!clean) return db[idx];
  const comment = { id: randomUUID(), text: clean, createdAt: new Date().toISOString(), author };
  const comments = db[idx].comments ? [...db[idx].comments, comment] : [comment];
  db[idx] = { ...db[idx], comments, updatedAt: new Date().toISOString() };
  return db[idx];
}

export function createAppeal(input: { title: string; body: string; authorId?: string; authorName?: string }): Appeal {
  const now = new Date().toISOString();
  const newItem: Appeal = {
    id: randomUUID(),
    title: input.title,
    body: input.body,
    status: "new",
    createdAt: now,
    updatedAt: now,
    authorId: input.authorId,
    authorName: input.authorName,
    comments: [],
  };
  db = [newItem, ...db];
  return newItem;
}
