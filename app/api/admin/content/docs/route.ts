import { badRequest, ok, serverError, unauthorized } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { createDocument, listDocuments } from "@/lib/documentsStore";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return unauthorized(request);
  }
  try {
    const documents = await listDocuments();
    return ok(request, { documents });
  } catch (error) {
    console.error("Error listing documents:", error);
    return serverError(request, "Ошибка получения списка документов", error);
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return unauthorized(request);
  }
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return badRequest(request, "Bad request");
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
      return badRequest(request, "Title required");
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
    return ok(request, { document: created });
  } catch (error) {
    console.error("Error creating document:", error);
    return serverError(request, "Ошибка создания документа", error);
  }
}
