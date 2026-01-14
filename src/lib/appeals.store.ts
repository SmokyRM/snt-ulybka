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
}
