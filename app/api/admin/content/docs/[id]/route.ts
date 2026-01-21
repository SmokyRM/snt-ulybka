import { badRequest, fail, ok, serverError, unauthorized } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { deleteDocument, getDocumentById, updateDocument } from "@/lib/documentsStore";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return unauthorized(request);
  }
  try {
    const document = await getDocumentById(params.id);
    if (!document) {
      return fail(request, "not_found", "Not found", 404);
    }
    return ok(request, { document });
  } catch (error) {
    console.error("Error fetching document:", error);
    return serverError(request, "Ошибка получения документа", error);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return unauthorized(request);
  }
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return badRequest(request, "Bad request");
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
      return fail(request, "not_found", "Not found", 404);
    }
    return ok(request, { document: updated });
  } catch (error) {
    console.error("Error updating document:", error);
    return serverError(request, "Ошибка обновления документа", error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return unauthorized(request);
  }
  try {
    const deleted = await deleteDocument(params.id);
    if (!deleted) {
      return fail(request, "not_found", "Not found", 404);
    }
    return ok(request, { ok: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return serverError(request, "Ошибка удаления документа", error);
  }
}
