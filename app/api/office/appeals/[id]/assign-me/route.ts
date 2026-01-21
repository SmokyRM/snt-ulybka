import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { assignToMe } from "@/server/services/appeals";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const appeal = await assignToMe(params.id);
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
    return serverError(request, "Ошибка при назначении обращения", error);
  }
}
