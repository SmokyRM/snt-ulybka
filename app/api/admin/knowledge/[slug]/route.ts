import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { updateKnowledgeArticle } from "@/lib/knowledgeStore";

export async function PUT(request: Request, { params }: { params: { slug: string } }) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ article: updated });
}
