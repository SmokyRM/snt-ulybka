import fs from "fs/promises";
import path from "path";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";
import { KNOWLEDGE_ARTICLES, type KnowledgeArticle } from "@/lib/knowledge/seed";

const filePath = path.join(process.cwd(), "data", "knowledge.json");

const normalizeArticle = (input: Partial<KnowledgeArticle>): KnowledgeArticle => ({
  slug: input.slug ?? "",
  title: input.title ?? "",
  summary: input.summary ?? "",
  category: input.category ?? "Общее",
  content: input.content ?? "",
  tags: Array.isArray(input.tags) ? input.tags : [],
  updatedAt: input.updatedAt ?? new Date().toISOString().slice(0, 10),
  documentSlugs: Array.isArray(input.documentSlugs) ? input.documentSlugs : [],
  published: typeof input.published === "boolean" ? input.published : true,
});

async function readAll(): Promise<KnowledgeArticle[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<KnowledgeArticle>[];
    if (!Array.isArray(parsed)) return [...KNOWLEDGE_ARTICLES];
    return parsed.map((item) => normalizeArticle(item));
  } catch {
    if (isServerlessReadonlyFs()) {
      warnReadonlyFs("knowledge:read-fallback");
      return [...KNOWLEDGE_ARTICLES];
    }
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await writeAll(KNOWLEDGE_ARTICLES);
    return [...KNOWLEDGE_ARTICLES];
  }
}

async function writeAll(items: KnowledgeArticle[]) {
  if (isServerlessReadonlyFs()) {
    warnReadonlyFs("knowledge:write");
    return;
  }
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

export async function listKnowledgeArticles() {
  return readAll();
}

export async function getKnowledgeArticle(slug: string) {
  if (!slug) return null;
  const items = await readAll();
  return items.find((item) => item.slug === slug) ?? null;
}

export async function createKnowledgeArticle(input: KnowledgeArticle) {
  const items = await readAll();
  if (items.some((item) => item.slug === input.slug)) {
    return null;
  }
  const next = normalizeArticle(input);
  items.unshift(next);
  await writeAll(items);
  return next;
}

export async function updateKnowledgeArticle(slug: string, patch: Partial<KnowledgeArticle>) {
  if (!slug) return null;
  const items = await readAll();
  const idx = items.findIndex((item) => item.slug === slug);
  if (idx === -1) return null;
  const next = normalizeArticle({
    ...items[idx],
    ...patch,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  items[idx] = next;
  await writeAll(items);
  return next;
}
