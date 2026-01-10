import fs from "fs/promises";
import path from "path";

export type KnowledgeArticle = {
  slug: string;
  title: string;
  category: string;
  order: number;
  updatedAt: string;
  tags: string[];
  content: string;
  summary: string;
  published: boolean;
  documentSlugs: string[];
};

type Frontmatter = Partial<Omit<KnowledgeArticle, "slug" | "content" | "summary" | "published">> & {
  published?: boolean;
  summary?: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content", "knowledge");

const parseFrontmatter = (raw: string): { data: Frontmatter; body: string } => {
  if (!raw.startsWith("---")) {
    return { data: {}, body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    return { data: {}, body: raw };
  }
  const fmRaw = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trim();
  const data: Frontmatter = {};
  fmRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (!key || rest.length === 0) return;
      const value = rest.join(":").trim();
      if (key === "title") data.title = value;
      else if (key === "category") data.category = value;
      else if (key === "order") data.order = Number(value);
      else if (key === "updatedAt") data.updatedAt = value;
      else if (key === "tags") {
        data.tags = value
          .replace(/\[|\]/g, "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      } else if (key === "documentSlugs") {
        data.documentSlugs = value
          .replace(/\[|\]/g, "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      } else if (key === "summary") {
        data.summary = value;
      } else if (key === "published") {
        data.published = value === "true";
      }
    });
  return { data, body };
};

const deriveSummary = (body: string, fallback = "") => {
  const firstParagraph = body.split("\n").find((line) => line.trim().length > 0);
  return firstParagraph ? firstParagraph.trim().slice(0, 240) : fallback;
};

const normalizeArticle = (slug: string, input: Frontmatter, body: string): KnowledgeArticle => ({
  slug,
  title: input.title ?? slug,
  category: input.category ?? "Общее",
  order: Number.isFinite(input.order) ? Number(input.order) : 99,
  updatedAt: input.updatedAt ?? new Date().toISOString().slice(0, 10),
  tags: Array.isArray(input.tags) ? input.tags : [],
  content: body,
  summary: input.summary ?? deriveSummary(body, slug),
  published: input.published !== false,
  documentSlugs: Array.isArray(input.documentSlugs) ? input.documentSlugs : [],
});

const readArticleFile = async (file: string): Promise<KnowledgeArticle | null> => {
  try {
    const raw = await fs.readFile(path.join(CONTENT_DIR, file), "utf8");
    const slug = file.replace(/\.mdx?$/i, "");
    const { data, body } = parseFrontmatter(raw);
    return normalizeArticle(slug, data, body);
  } catch {
    return null;
  }
};

export async function getAllArticles(): Promise<KnowledgeArticle[]> {
  let files: string[];
  try {
    files = await fs.readdir(CONTENT_DIR);
  } catch {
    return [];
  }
  const mdFiles = files.filter((file) => file.endsWith(".md") || file.endsWith(".mdx"));
  const items = await Promise.all(mdFiles.map((file) => readArticleFile(file)));
  const articles = (items.filter(Boolean) as KnowledgeArticle[]).filter((item) => item.published);
  return articles.sort((a, b) => {
    if (a.category === b.category) {
      if (a.order === b.order) return a.title.localeCompare(b.title);
      return a.order - b.order;
    }
    return a.category.localeCompare(b.category);
  });
}

export async function getArticleBySlug(slug: string): Promise<KnowledgeArticle | null> {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, "");
  if (!safeSlug) return null;
  const files = [`${safeSlug}.md`, `${safeSlug}.mdx`];
  for (const file of files) {
    const article = await readArticleFile(file);
    if (article && article.published) return article;
  }
  return null;
}

export async function getArticlesByCategory(category: string): Promise<KnowledgeArticle[]> {
  const all = await getAllArticles();
  return all.filter((item) => item.category === category);
}
