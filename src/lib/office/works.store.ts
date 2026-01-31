import { createId } from "@/lib/mockDb";

export type WorkStatus = "planned" | "in_progress" | "done";

export type WorkRecord = {
  id: string;
  title: string;
  description: string;
  location: string;
  plotId: string | null;
  contractorName: string | null;
  cost: number;
  currency: "RUB";
  status: WorkStatus;
  startedAt: string | null;
  finishedAt: string | null;
  photoBeforeUrls: string[];
  photoAfterUrls: string[];
  linkedAppealIds: string[];
  linkedDocumentIds: string[];
  createdAt: string;
  createdBy: string | null;
};

type WorksDb = {
  items: WorkRecord[];
};

const getDb = (): WorksDb => {
  const g = globalThis as typeof globalThis & { __SNT_WORKS_DB__?: WorksDb };
  if (!g.__SNT_WORKS_DB__) {
    g.__SNT_WORKS_DB__ = { items: [] };
  }
  return g.__SNT_WORKS_DB__;
};

const normalizeUrls = (values: string[]) =>
  values.map((v) => v.trim()).filter(Boolean);

export function listWorks(filters?: {
  status?: WorkStatus | null;
  period?: string | null;
  location?: string | null;
  contractor?: string | null;
  appealId?: string | null;
  documentId?: string | null;
}) {
  const db = getDb();
  let items = [...db.items];
  if (filters?.status) {
    items = items.filter((item) => item.status === filters.status);
  }
  if (filters?.period) {
    items = items.filter((item) => (item.startedAt ?? item.createdAt).slice(0, 7) === filters.period);
  }
  if (filters?.location) {
    const q = filters.location.toLowerCase();
    items = items.filter((item) => item.location.toLowerCase().includes(q));
  }
  if (filters?.contractor) {
    const q = filters.contractor.toLowerCase();
    items = items.filter((item) => (item.contractorName ?? "").toLowerCase().includes(q));
  }
  if (filters?.appealId) {
    items = items.filter((item) => item.linkedAppealIds.includes(filters.appealId!));
  }
  if (filters?.documentId) {
    items = items.filter((item) => item.linkedDocumentIds.includes(filters.documentId!));
  }
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getWork(id: string) {
  const db = getDb();
  return db.items.find((item) => item.id === id) ?? null;
}

export function createWork(input: Omit<WorkRecord, "id" | "createdAt" | "createdBy" | "currency"> & { createdBy?: string | null }) {
  const db = getDb();
  const now = new Date().toISOString();
  const record: WorkRecord = {
    id: createId("work"),
    createdAt: now,
    createdBy: input.createdBy ?? null,
    currency: "RUB",
    title: input.title.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
    plotId: input.plotId ?? null,
    contractorName: input.contractorName ?? null,
    cost: input.cost ?? 0,
    status: input.status,
    startedAt: input.startedAt ?? null,
    finishedAt: input.finishedAt ?? null,
    photoBeforeUrls: normalizeUrls(input.photoBeforeUrls ?? []),
    photoAfterUrls: normalizeUrls(input.photoAfterUrls ?? []),
    linkedAppealIds: input.linkedAppealIds ?? [],
    linkedDocumentIds: input.linkedDocumentIds ?? [],
  };
  db.items.unshift(record);
  return record;
}

export function updateWork(id: string, patch: Partial<Omit<WorkRecord, "id" | "createdAt" | "createdBy" | "currency">>) {
  const db = getDb();
  const idx = db.items.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const current = db.items[idx];
  const updated: WorkRecord = {
    ...current,
    ...patch,
    title: patch.title ? patch.title.trim() : current.title,
    description: patch.description ? patch.description.trim() : current.description,
    location: patch.location ? patch.location.trim() : current.location,
    photoBeforeUrls: patch.photoBeforeUrls ? normalizeUrls(patch.photoBeforeUrls) : current.photoBeforeUrls,
    photoAfterUrls: patch.photoAfterUrls ? normalizeUrls(patch.photoAfterUrls) : current.photoAfterUrls,
    linkedAppealIds: patch.linkedAppealIds ?? current.linkedAppealIds,
    linkedDocumentIds: patch.linkedDocumentIds ?? current.linkedDocumentIds,
  };
  db.items[idx] = updated;
  return updated;
}

export function linkAppealToWork(id: string, appealId: string, action: "link" | "unlink") {
  const work = getWork(id);
  if (!work) return null;
  const set = new Set(work.linkedAppealIds);
  if (action === "link") set.add(appealId);
  if (action === "unlink") set.delete(appealId);
  return updateWork(id, { linkedAppealIds: Array.from(set) });
}

export function linkDocumentToWork(id: string, documentId: string, action: "link" | "unlink") {
  const work = getWork(id);
  if (!work) return null;
  const set = new Set(work.linkedDocumentIds);
  if (action === "link") set.add(documentId);
  if (action === "unlink") set.delete(documentId);
  return updateWork(id, { linkedDocumentIds: Array.from(set) });
}
