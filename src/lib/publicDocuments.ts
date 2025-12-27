export type PublicDocumentCategory =
  | "charter"
  | "meetings"
  | "fees"
  | "electricity"
  | "templates";

export type PublicDocument = {
  id: string;
  category: PublicDocumentCategory;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  downloadUrl: string;
};

export const DOCUMENT_CATEGORIES: Array<{
  key: PublicDocumentCategory;
  label: string;
}> = [
  { key: "charter", label: "Устав" },
  { key: "meetings", label: "Протоколы собраний" },
  { key: "fees", label: "Взносы / тарифы" },
  { key: "electricity", label: "Электричество" },
  { key: "templates", label: "Шаблоны заявлений" },
];

export const PUBLIC_DOCUMENTS: PublicDocument[] = [
  {
    id: "charter-2020",
    category: "charter",
    title: "Устав СНТ «Улыбка»",
    date: "2020-05-18",
    description: "Действующая редакция устава товарищества.",
    downloadUrl: "/docs/charter.pdf",
  },
  {
    id: "protocol-2024-01",
    category: "meetings",
    title: "Протокол общего собрания №1/2024",
    date: "2024-03-12",
    description: "Решения и итоги общего собрания членов СНТ.",
    downloadUrl: "/docs/protocol-2024-01.pdf",
  },
  {
    id: "fees-2025",
    category: "fees",
    title: "Размеры взносов на 2025 год",
    date: "2025-01-20",
    description: "Текущие ставки членских и целевых взносов.",
    downloadUrl: "/docs/fees-2025.pdf",
  },
  {
    id: "electricity-tariff-2025",
    category: "electricity",
    title: "Тарифы на электроэнергию (2025)",
    date: "2025-02-05",
    description: "Информация о тарифе и порядке оплаты.",
    downloadUrl: "/docs/electricity-tariff-2025.pdf",
  },
  {
    id: "template-membership",
    category: "templates",
    title: "Заявление о вступлении / подтверждении",
    date: "2023-09-01",
    description: "Шаблон заявления для членов СНТ.",
    downloadUrl: "/docs/template-membership.pdf",
  },
];
