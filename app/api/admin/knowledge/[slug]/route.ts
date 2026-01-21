import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { updateKnowledgeArticle } from "@/lib/knowledgeStore";
import { fail, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function PUT(request: Request, { params }: { params: { slug: string } }) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return unauthorized(request, "Unauthorized");
  }
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return fail(request, "validation_error", "Bad request", 400);
    }
    const patch = {
      slug: typeof body.slug === "string" ? body.slug.trim() : undefined,
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      summary: typeof body.summary === "string" ? body.summary.trim() : undefined,
      category: typeof body.category === "string" ? body.category.trim() : undefined,
      content: typeof body.content === "string" ? body.content : undefined,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      documentSlugs: Array.isArray(body.documentSlugs) ? body.documentSlugs : undefined,
      published: typeof body.published === "boolean" ? body.published : undefined,
    };
    const updated = await updateKnowledgeArticle(params.slug, patch);
    if (!updated) {
      return fail(request, "not_found", "Not found", 404);
    }
    return ok(request, { article: updated });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
