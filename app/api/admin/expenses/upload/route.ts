import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { uploadDocument } from "@/lib/uploadDocument";
import { badRequest, fail, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return badRequest(request, "Файл не предоставлен");
    }

    const result = await uploadDocument(file);
    return ok(request, {
      url: result.url,
      filename: result.filename,
      mime: result.mime,
      size: result.size,
    });
  } catch (e) {
    const error = e as Error;
    if (error.message === "MISSING_BLOB_TOKEN") {
      return fail(request, "service_unavailable", "Сервис загрузки файлов недоступен", 503);
    }
    if (error.message === "UNSUPPORTED_MIME") {
      return badRequest(request, "Неподдерживаемый тип файла");
    }
    if (error.message === "FILE_TOO_LARGE") {
      return badRequest(request, "Файл слишком большой (максимум 10 МБ)");
    }
    return serverError(request, "Ошибка загрузки файла", e);
  }
}
