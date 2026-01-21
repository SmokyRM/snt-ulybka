import { badRequest, ok, serverError, unauthorized } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { uploadDocument } from "@/lib/uploadDocument";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return unauthorized(request);
  }
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return badRequest(request, "Некорректные данные");
    }
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return badRequest(request, "Файл не найден");
    }
    const uploaded = await uploadDocument(file);
    return ok(request, {
      url: uploaded.url,
      filename: uploaded.filename,
      mime: uploaded.mime,
      size: uploaded.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";
    if (message === "UNSUPPORTED_MIME" || message === "FILE_TOO_LARGE") {
      return badRequest(request, message);
    }
    return serverError(request, message, error);
  }
}
