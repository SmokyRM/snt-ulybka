import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { deleteDocument, getDocumentById, updateDocument } from "@/lib/documentsStore";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const document = await getDocumentById(params.id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ document });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
    description: typeof body.description === "string" ? body.description.trim() : undefined,
    category: typeof body.category === "string" ? body.category.trim() : undefined,
    published: typeof body.published === "boolean" ? body.published : undefined,
    audience: Array.isArray(body.audience) ? body.audience : undefined,
    fileUrl: typeof body.fileUrl === "string" ? body.fileUrl : body.fileUrl === null ? null : undefined,
    mime: typeof body.mime === "string" ? body.mime : body.mime === null ? null : undefined,
    size: typeof body.size === "number" ? body.size : body.size === null ? null : undefined,
  };
  const updated = await updateDocument(params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ document: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ok = await deleteDocument(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
