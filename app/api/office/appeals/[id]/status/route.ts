import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { updateAppealStatus } from "@/server/services/appeals";
import type { AppealStatus } from "@/lib/office/types";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const status = body.status as AppealStatus | undefined;
    const comment = typeof body.comment === "string" ? body.comment : undefined;

    if (!status || (status !== "new" && status !== "in_progress" && status !== "needs_info" && status !== "closed")) {
      return fail(request, "validation_error", "Неверный статус обращения", 400);
    }

    const appeal = await updateAppealStatus(params.id, { status, comment });
    return ok(request, { appeal });
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
    return serverError(request, "Ошибка при обновлении статуса обращения", error);
  }
}
