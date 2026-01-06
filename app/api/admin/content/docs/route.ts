import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { createDocument, listDocuments } from "@/lib/documentsStore";

export async function GET() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const documents = await listDocuments();
  return NextResponse.json({ documents });
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
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const published = Boolean(body.published);
  const audience = Array.isArray(body.audience) ? body.audience : [];
  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : null;
  const mime = typeof body.mime === "string" ? body.mime : null;
  const size = typeof body.size === "number" ? body.size : null;
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  const created = await createDocument({
    slug,
    title,
    description: description || null,
    category: category || "Общее",
    published,
    audience: audience.length > 0 ? audience : ["guest"],
    fileUrl,
    mime,
    size,
  });
  return NextResponse.json({ document: created });
}
