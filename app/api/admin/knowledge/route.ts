import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import {
  createKnowledgeArticle,
  listKnowledgeArticles,
} from "@/lib/knowledgeStore";
import { fail, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return unauthorized(request, "Unauthorized");
  }
  try {
    const articles = await listKnowledgeArticles();
    return ok(request, { articles });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return unauthorized(request, "Unauthorized");
  }
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return fail(request, "validation_error", "Bad request", 400);
    }
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const content = typeof body.content === "string" ? body.content : "";
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const documentSlugs = Array.isArray(body.documentSlugs) ? body.documentSlugs : [];
    const published = typeof body.published === "boolean" ? body.published : true;
    if (!slug || !title) {
      return fail(request, "validation_error", "Slug and title required", 400);
    }
    const created = await createKnowledgeArticle({
      slug,
      title,
      summary,
      category: category || "Общее",
      content,
      tags,
      documentSlugs,
      updatedAt: new Date().toISOString().slice(0, 10),
      published,
    });
    if (!created) {
      return fail(request, "validation_error", "Already exists", 400);
    }
    return ok(request, { article: created });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
