import { randomUUID } from "crypto";

export type DocumentStatus = "draft" | "published";
export type DocumentCategory = "rules" | "templates" | "reports" | "other";
export type DocumentVisibility = "all" | "residents" | "staff";

export type Document = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description?: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  fileName?: string;
  fileUrl?: string;
  fileId?: string;
  authorRole?: string;
};

type ListParams = {
  status?: DocumentStatus | "all";
  q?: string | null;
  category?: DocumentCategory | "all";
  visibility?: DocumentVisibility;
};

const seed: Document[] = [
  {
    id: "doc1",
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    title: "Устав СНТ",
    description: "Действующая редакция устава",
    category: "rules",
    visibility: "all",
    status: "published",
    fileName: "ustav.pdf",
    fileUrl: "/docs/ustav.pdf",
    authorRole: "chairman",
  },
  {
    id: "doc2",
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    title: "Протокол собрания",
    description: "Собрание правления от 12.01",
    category: "reports",
    visibility: "residents",
    status: "published",
    fileName: "protocol.pdf",
    fileUrl: "/docs/protocol.pdf",
    authorRole: "secretary",
  },
  {
    id: "doc3",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    title: "Шаблон обращения",
    description: "Базовый шаблон для обращения в правление",
    category: "templates",
    visibility: "residents",
    status: "published",
    fileName: "appeal-template.docx",
    authorRole: "secretary",
  },
  {
    id: "doc4",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    title: "Финансовый отчет",
    description: "Черновик отчёта за квартал",
    category: "reports",
    visibility: "staff",
    status: "draft",
    authorRole: "accountant",
  },
  {
    id: "doc5",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    title: "Инструкция по доступу",
    description: "Как получить доступ к кабинету",
    category: "other",
    visibility: "all",
    status: "published",
    authorRole: "chairman",
  },
  {
    id: "doc6",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    title: "Шаблон заявления на перерасчёт",
    description: "Для случаев спорных начислений",
    category: "templates",
    visibility: "residents",
    status: "draft",
    authorRole: "secretary",
  },
];

let db: Document[] = [...seed];

export function listDocuments(params: ListParams = {}): Document[] {
  const { status, q, category, visibility } = params;
  let items = [...db];
  if (status && status !== "all") {
    items = items.filter((item) => item.status === status);
  }
  if (category && category !== "all") {
    items = items.filter((item) => item.category === category);
  }
  if (visibility) {
    items = items.filter((item) => item.visibility === visibility || item.visibility === "all");
  }
  if (q) {
    const query = q.toLowerCase();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false) ||
        (item.fileName?.toLowerCase().includes(query) ?? false),
    );
  }
  return items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getDocument(id: string): Document | null {
  return db.find((item) => item.id === id) ?? null;
}

export function createDocument(input: {
  title: string;
  description?: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  authorRole: string;
  fileName?: string;
  fileUrl?: string;
  fileId?: string;
}): Document {
  const now = new Date().toISOString();
  const item: Document = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "draft",
    ...input,
  };
  db = [item, ...db];
  return item;
}

export function togglePublish(id: string): Document | null {
  const idx = db.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const nextStatus: DocumentStatus = db[idx].status === "published" ? "draft" : "published";
  db[idx] = { ...db[idx], status: nextStatus, updatedAt: new Date().toISOString() };
  return db[idx];
}

export function updateDocument(id: string, patch: Partial<Omit<Document, "id" | "createdAt">>): Document | null {
  const idx = db.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  db[idx] = { ...db[idx], ...patch, updatedAt: new Date().toISOString() };
  return db[idx];
}

export function removeDocument(id: string): boolean {
  const prev = db.length;
  db = db.filter((item) => item.id !== id);
  return db.length < prev;
}
