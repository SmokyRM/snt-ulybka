import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { addAppealComment } from "@/server/services/appeals";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text : undefined;

    if (!text || !text.trim()) {
      return fail(request, "validation_error", "Текст комментария обязателен", 400);
    }

    const comment = await addAppealComment(params.id, { text: text.trim() });
    return ok(request, { comment });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return unauthorized(request);
      }
      if (error.message === "FORBIDDEN") {
        return forbidden(request);
      }
      if (error.message === "NOT_FOUND") {
        return fail(request, "not_found", "Обращение не найдено", 404);
      }
    }
    return serverError(request, "Ошибка при добавлении комментария", error);
  }
}
