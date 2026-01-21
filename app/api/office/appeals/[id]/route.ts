import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getAppeal, getAppealActivity } from "@/server/services/appeals";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const appeal = await getAppeal(params.id);
    if (!appeal) {
      return fail(request, "not_found", "Обращение не найдено", 404);
    }

    // Получаем активность вместе с обращением
    const activity = await getAppealActivity(params.id);

    return ok(request, { appeal, activity });
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
    return serverError(request, "Ошибка при получении обращения", error);
  }
}
