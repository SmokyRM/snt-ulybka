import { createId } from "@/lib/mockDb";

export type OfficeDocumentType = "protocol" | "smeta" | "act" | "charter" | "monthly_report" | "other";

export type OfficeDocumentRecord = {
  id: string;
  title: string;
  type: OfficeDocumentType;
  period: string | null;
  tags: string[];
  isPublic: boolean;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string | null;
};

type OfficeDocumentsDb = {
  items: OfficeDocumentRecord[];
};

const getDb = (): OfficeDocumentsDb => {
  const g = globalThis as typeof globalThis & { __SNT_OFFICE_DOCS_DB__?: OfficeDocumentsDb };
  if (!g.__SNT_OFFICE_DOCS_DB__) {
    g.__SNT_OFFICE_DOCS_DB__ = { items: [] };
  }
  return g.__SNT_OFFICE_DOCS_DB__;
};

const normalizeTags = (tags: string[]) =>
  Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));

export function listOfficeDocuments(filters?: {
  type?: OfficeDocumentType | null;
  period?: string | null;
  tag?: string | null;
  isPublic?: boolean | null;
}) {
  const db = getDb();
  let items = [...db.items];
  if (filters?.type) {
    items = items.filter((item) => item.type === filters.type);
  }
  if (filters?.period) {
    items = items.filter((item) => item.period === filters.period);
  }
  if (filters?.tag) {
    items = items.filter((item) => item.tags.includes(filters.tag!));
  }
  if (filters?.isPublic !== null && filters?.isPublic !== undefined) {
    items = items.filter((item) => item.isPublic === filters.isPublic);
  }
  return items.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
}

export function listPublicOfficeDocuments() {
  return listOfficeDocuments({ isPublic: true });
}

export function createOfficeDocument(input: {
  title: string;
  type: OfficeDocumentType;
  period?: string | null;
  tags?: string[];
  isPublic?: boolean;
  fileName: string;
  fileUrl: string;
  uploadedBy?: string | null;
}): OfficeDocumentRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const record: OfficeDocumentRecord = {
    id: createId("doc"),
    title: input.title.trim(),
    type: input.type,
    period: input.period ?? null,
    tags: normalizeTags(input.tags ?? []),
    isPublic: Boolean(input.isPublic),
    fileName: input.fileName,
    fileUrl: input.fileUrl,
    uploadedAt: now,
    uploadedBy: input.uploadedBy ?? null,
  };
  db.items.unshift(record);
  return record;
}

export function deleteOfficeDocument(id: string) {
  const db = getDb();
  const before = db.items.length;
  db.items = db.items.filter((item) => item.id !== id);
  return db.items.length < before;
}
