import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { previewImport } from "@/server/services/finance";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const content = formData.get("content");

    if (!file && !content) {
      return fail(request, "validation_error", "Файл не предоставлен", 400);
    }

    const csvContent = typeof content === "string" ? content : file instanceof Blob ? await file.text() : "";

    if (!csvContent) {
      return fail(request, "validation_error", "Пустой файл", 400);
    }

    const mapping = formData.get("mapping");
    const mappingObj = mapping && typeof mapping === "string" ? JSON.parse(mapping) : undefined;

    const preview = await previewImport(csvContent, mappingObj);

    return ok(request, preview);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized(request);
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return forbidden(request);
    }
    return serverError(request, "Ошибка при обработке файла", error);
  }
}
