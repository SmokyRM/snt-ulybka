import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import {
  createKnowledgeArticle,
  listKnowledgeArticles,
} from "@/lib/knowledgeStore";

export async function GET() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const articles = await listKnowledgeArticles();
  return NextResponse.json({ articles });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
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
    return NextResponse.json({ error: "Slug and title required" }, { status: 400 });
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
    return NextResponse.json({ error: "Already exists" }, { status: 400 });
  }
  return NextResponse.json({ article: created });
}
