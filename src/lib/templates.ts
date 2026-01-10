import fs from "fs/promises";
import path from "path";
export type Template = {
  slug: string;
  title: string;
  category: string;
  order: number;
  tags: string[];
  summary: string;
  description?: string;
  updatedAt: string;
  content: string;
};

type Frontmatter = Partial<
  Omit<Template, "slug" | "content" | "summary" | "order" | "updatedAt">
> & {
  order?: number;
  summary?: string;
  updatedAt?: string;
  description?: string;
};

const TEMPLATES_DIR = path.join(process.cwd(), "content", "templates");

const parseFrontmatter = (raw: string): { data: Frontmatter; body: string } => {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: raw };
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
      else if (key === "summary") data.summary = value;
      else if (key === "description") data.description = value;
      else if (key === "tags") {
        data.tags = value
          .replace(/\[|\]/g, "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    });
  return { data, body };
};

const deriveSummary = (body: string, fallback: string) => {
  const first = body.split("\n").find((line) => line.trim());
  return first ? first.trim().slice(0, 240) : fallback;
};

const normalizeTemplate = (slug: string, data: Frontmatter, body: string): Template => ({
  slug,
  title: data.title ?? slug,
  category: data.category ?? "Общее",
  order: Number.isFinite(data.order) ? Number(data.order) : 99,
  tags: Array.isArray(data.tags) ? data.tags : [],
  summary: data.summary ?? deriveSummary(body, slug),
  description: data.description ?? data.summary ?? deriveSummary(body, slug),
  updatedAt: data.updatedAt ?? new Date().toISOString().slice(0, 10),
  content: body,
});

const readTemplateFile = async (file: string): Promise<Template | null> => {
  try {
    const raw = await fs.readFile(path.join(TEMPLATES_DIR, file), "utf8");
    const slug = file.replace(/\.mdx?$/i, "");
    const { data, body } = parseFrontmatter(raw);
    return normalizeTemplate(slug, data, body);
  } catch {
    return null;
  }
};

export async function getAllTemplates(): Promise<Template[]> {
  const files = await fs.readdir(TEMPLATES_DIR).catch(() => []);
  const mdFiles = files.filter((file) => file.endsWith(".md") || file.endsWith(".mdx"));
  const templates = (await Promise.all(mdFiles.map((file) => readTemplateFile(file)))).filter(
    Boolean,
  ) as Template[];
  return templates.sort((a, b) => {
    if (a.category === b.category) {
      if (a.order === b.order) return a.title.localeCompare(b.title);
      return a.order - b.order;
    }
    return a.category.localeCompare(b.category);
  });
}

export async function getTemplateBySlug(slug: string): Promise<Template | null> {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, "");
  if (!safeSlug) return null;
  const files = [`${safeSlug}.md`, `${safeSlug}.mdx`];
  for (const file of files) {
    const tpl = await readTemplateFile(file);
    if (tpl) return tpl;
  }
  return null;
}

export async function getTemplatesByCategory(category: string): Promise<Template[]> {
  const all = await getAllTemplates();
  return all.filter((tpl) => tpl.category === category);
}

const fallback = "________";

export type TemplateContext = {
  fullName: string;
  plotNumbers: string;
  cadastralNumbers: string;
  phone: string;
  email: string;
  date: string;
};

export const getTemplateContext = (): TemplateContext => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    fullName: fallback,
    plotNumbers: fallback,
    cadastralNumbers: fallback,
    phone: fallback,
    email: fallback,
    date: today,
  };
};

export const renderTemplate = (content: string): string => {
  const today = new Date().toISOString().slice(0, 10);
  return content
    .replace(/{{\s*fullName\s*}}/g, fallback)
    .replace(/{{\s*plotNumbers\s*}}/g, fallback)
    .replace(/{{\s*cadastralNumbers\s*}}/g, fallback)
    .replace(/{{\s*phone\s*}}/g, fallback)
    .replace(/{{\s*email\s*}}/g, fallback)
    .replace(/{{\s*date\s*}}/g, today);
};

export const fillTemplate = (content: string, ctx?: Partial<TemplateContext>) => {
  const base = ctx
    ? {
        fullName: ctx.fullName ?? fallback,
        plotNumbers: ctx.plotNumbers ?? fallback,
        cadastralNumbers: ctx.cadastralNumbers ?? fallback,
        phone: ctx.phone ?? fallback,
        email: ctx.email ?? fallback,
        date: ctx.date ?? new Date().toISOString().slice(0, 10),
      }
    : getTemplateContext();
  return content
    .replace(/{{\s*fullName\s*}}/g, base.fullName)
    .replace(/{{\s*plotNumbers\s*}}/g, base.plotNumbers)
    .replace(/{{\s*cadastralNumbers\s*}}/g, base.cadastralNumbers)
    .replace(/{{\s*phone\s*}}/g, base.phone)
    .replace(/{{\s*email\s*}}/g, base.email)
    .replace(/{{\s*date\s*}}/g, base.date);
};

type PlotLite = { plotId?: string; plotNumber?: string | null; displayName?: string | null; cadastral?: string | null };
type ProfileLite = { fullName?: string | null; phone?: string | null; email?: string | null };

export const buildTemplateContext = (
  profile: ProfileLite | null,
  plots: PlotLite[],
  plotId?: string | null,
): TemplateContext => {
  const today = new Date().toISOString().slice(0, 10);
  const targetPlots =
    plotId && plotId !== "all"
      ? plots.filter((p) => p.plotId === plotId)
      : plots;
  const plotNumbers = targetPlots
    .map((p) => p.plotNumber || p.displayName)
    .filter(Boolean)
    .join(", ");
  const cadastralNumbers = targetPlots
    .map((p) => p.cadastral || p.plotNumber)
    .filter(Boolean)
    .join(", ");
  return {
    fullName: profile?.fullName || fallback,
    phone: profile?.phone || fallback,
    email: profile?.email || fallback,
    plotNumbers: plotNumbers || fallback,
    cadastralNumbers: cadastralNumbers || fallback,
    date: today,
  };
};
