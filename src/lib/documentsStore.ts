import fs from "fs/promises";
import path from "path";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";

export type DocumentAudience = "guest" | "user" | "board" | "chair" | "admin";

export type DocumentRecord = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  category: string;
  published: boolean;
  audience: DocumentAudience[];
  fileUrl: string | null;
  mime: string | null;
  size: number | null;
  createdAt: string;
  updatedAt: string;
};

const filePath = path.join(process.cwd(), "data", "documents.json");

const toSlug = (value: string, fallback: string) => {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || fallback;
};

const normalizeDocument = (input: Partial<DocumentRecord>): DocumentRecord => {
  const id = input.id ?? "";
  const title = input.title ?? "";
  const slug = input.slug ? input.slug : toSlug(title, id || "doc");
  return {
    id,
    slug,
    title,
    description: typeof input.description === "string" ? input.description : null,
    category: input.category ?? "Общее",
    published: Boolean(input.published),
    audience: Array.isArray(input.audience) ? input.audience : ["guest"],
    fileUrl: input.fileUrl ?? null,
    mime: typeof input.mime === "string" ? input.mime : null,
    size: typeof input.size === "number" ? input.size : null,
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
};

async function readAll(): Promise<DocumentRecord[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DocumentRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeDocument(item));
  } catch {
    if (isServerlessReadonlyFs()) {
      warnReadonlyFs("documents:read-fallback");
      return [];
    }
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await writeAll([]);
    return [];
  }
}

async function writeAll(items: DocumentRecord[]) {
  if (isServerlessReadonlyFs()) {
    warnReadonlyFs("documents:write");
    return;
  }
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function listDocuments(): Promise<DocumentRecord[]> {
  return readAll();
}

export async function getDocumentById(id: string): Promise<DocumentRecord | null> {
  if (!id) return null;
  const items = await readAll();
  return items.find((item) => item.id === id) ?? null;
}

export async function getDocumentBySlug(slug: string): Promise<DocumentRecord | null> {
  if (!slug) return null;
  const items = await readAll();
  return items.find((item) => item.slug === slug) ?? null;
}

export async function createDocument(
  input: Omit<DocumentRecord, "id" | "createdAt" | "updatedAt">,
) {
  const items = await readAll();
  const now = new Date().toISOString();
  const doc: DocumentRecord = {
    ...normalizeDocument(input),
    id: makeId(),
    createdAt: now,
    updatedAt: now,
  };
  items.unshift(doc);
  await writeAll(items);
  return doc;
}

export async function updateDocument(
  id: string,
  patch: Partial<Omit<DocumentRecord, "id" | "createdAt">>,
) {
  if (!id) return null;
  const items = await readAll();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const next: DocumentRecord = {
    ...items[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  items[idx] = normalizeDocument(next);
  await writeAll(items);
  return items[idx];
}

export async function deleteDocument(id: string) {
  if (!id) return false;
  const items = await readAll();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  await writeAll(next);
  return true;
}
