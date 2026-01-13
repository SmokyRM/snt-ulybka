<<<<<<< HEAD
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
=======
export type AppealStatus = "new" | "in_progress" | "done";

export type Appeal = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  body: string;
  status: AppealStatus;
  plotNumber?: string;
  authorName?: string;
  authorPhone?: string;
  comments: AppealComment[];
};

export type AppealComment = {
  id: string;
  createdAt: string;
  authorRole: "chairman" | "secretary";
  text: string;
};

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
    comments: [
      {
        id: "c1",
        createdAt: "2024-01-12T12:00:00.000Z",
        authorRole: "chairman",
        text: "Получили, проверяем начисления.",
      },
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
    comments: [
      {
        id: "c2",
        createdAt: "2024-02-18T10:00:00.000Z",
        authorRole: "secretary",
        text: "Показания внесли, начисление обновлено.",
      },
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
  return seedAppeals.find((appeal) => appeal.id === id) ?? null;
}

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
  authorRole: "chairman" | "secretary",
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
    comments: [comment, ...seedAppeals[idx].comments],
  };
  seedAppeals[idx] = updated;
  return updated;
>>>>>>> 737c5be (codex snapshot)
}
