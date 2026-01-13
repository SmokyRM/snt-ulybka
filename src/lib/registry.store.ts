export type RegistryItem = {
  id: string;
  plotNumber: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  status?: "verified" | "pending" | "draft";
  updatedAt: string;
};

const seedRegistry: RegistryItem[] = [
  {
    id: "r1",
    plotNumber: "Березовая, 12",
    ownerName: "Анна Петрова",
    phone: "+7 917 111-22-33",
    email: "anna@example.com",
    status: "verified",
    updatedAt: "2024-03-01T10:00:00.000Z",
  },
  {
    id: "r2",
    plotNumber: "Луговая, 7",
    ownerName: "Сергей К.",
    phone: "+7 905 222-33-44",
    email: "sergey@example.com",
    status: "pending",
    updatedAt: "2024-03-02T09:30:00.000Z",
  },
  {
    id: "r3",
    plotNumber: "Сиреневая, 3",
    ownerName: "Марина Л.",
    phone: "+7 912 333-44-55",
    email: "marina@example.com",
    status: "verified",
    updatedAt: "2024-03-03T11:15:00.000Z",
  },
  {
    id: "r4",
    plotNumber: "Лесная, 21",
    ownerName: "Иван Н.",
    phone: "+7 999 000-11-22",
    email: "ivan@example.com",
    status: "pending",
    updatedAt: "2024-03-04T12:45:00.000Z",
  },
  {
    id: "r5",
    plotNumber: "Речная, 5",
    ownerName: "Иван П.",
    phone: "+7 905 555-66-77",
    email: "ivanp@example.com",
    status: "draft",
    updatedAt: "2024-03-05T08:20:00.000Z",
  },
  {
    id: "r6",
    plotNumber: "Солнечная, 14",
    ownerName: "Елена С.",
    phone: "+7 918 777-88-99",
    email: "elena@example.com",
    status: "verified",
    updatedAt: "2024-03-06T15:05:00.000Z",
  },
  {
    id: "r7",
    plotNumber: "Кленовая, 2",
    ownerName: "Алексей Т.",
    status: "draft",
    updatedAt: "2024-03-06T16:10:00.000Z",
  },
  {
    id: "r8",
    plotNumber: "Дачная, 18",
    ownerName: "Ольга Р.",
    phone: "+7 904 123-45-67",
    status: "verified",
    updatedAt: "2024-03-07T09:55:00.000Z",
  },
  {
    id: "r9",
    plotNumber: "Полевая, 9",
    ownerName: "Николай В.",
    status: "pending",
    updatedAt: "2024-03-07T14:10:00.000Z",
  },
  {
    id: "r10",
    plotNumber: "Яблоневая, 6",
    ownerName: "Светлана Б.",
    email: "svetlana@example.com",
    status: "verified",
    updatedAt: "2024-03-08T10:40:00.000Z",
  },
  {
    id: "r11",
    plotNumber: "Сосновая, 15",
    ownerName: "Владимир Д.",
    status: "verified",
    updatedAt: "2024-03-08T12:00:00.000Z",
  },
  {
    id: "r12",
    plotNumber: "Липовая, 4",
    ownerName: "Ирина К.",
    status: "draft",
    updatedAt: "2024-03-09T09:30:00.000Z",
  },
  {
    id: "r13",
    plotNumber: "Ореховая, 20",
    ownerName: "Дмитрий Ф.",
    status: "verified",
    updatedAt: "2024-03-09T13:15:00.000Z",
  },
  {
    id: "r14",
    plotNumber: "Ромашковая, 11",
    ownerName: "Екатерина М.",
    status: "pending",
    updatedAt: "2024-03-10T11:50:00.000Z",
  },
  {
    id: "r15",
    plotNumber: "Ландышевая, 8",
    ownerName: "Татьяна Ч.",
    status: "verified",
    updatedAt: "2024-03-10T16:25:00.000Z",
  },
  {
    id: "r16",
    plotNumber: "Сиреневая, 5",
    ownerName: "Наталья Я.",
    status: "draft",
    updatedAt: "2024-03-11T10:00:00.000Z",
  },
  {
    id: "r17",
    plotNumber: "Вишнёвая, 19",
    ownerName: "Павел Р.",
    status: "pending",
    updatedAt: "2024-03-11T12:00:00.000Z",
  },
  {
    id: "r18",
    plotNumber: "Тополёвая, 1",
    ownerName: "Софья Т.",
    status: "verified",
    updatedAt: "2024-03-12T09:00:00.000Z",
  },
  {
    id: "r19",
    plotNumber: "Молодёжная, 22",
    ownerName: "Галина С.",
    status: "draft",
    updatedAt: "2024-03-12T14:10:00.000Z",
  },
  {
    id: "r20",
    plotNumber: "Центральная, 2",
    ownerName: "Юрий Н.",
    status: "verified",
    updatedAt: "2024-03-13T11:40:00.000Z",
  },
];

type ListParams = { q?: string };

export function listRegistry(params: ListParams = {}): RegistryItem[] {
  const query = params.q?.trim().toLowerCase();
  return seedRegistry
    .filter((item) => {
      if (!query) return true;
      const haystack = `${item.plotNumber} ${item.ownerName ?? ""} ${item.phone ?? ""} ${item.email ?? ""}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getRegistryItem(id: string): RegistryItem | null {
  return seedRegistry.find((item) => item.id === id) ?? null;
}

export function findRegistryByPlotNumber(plotNumber: string): RegistryItem | null {
  const target = plotNumber.trim();
  if (!target) return null;
  return seedRegistry.find((item) => item.plotNumber.trim() === target) ?? null;
}
