import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { addAppealComment } from "@/server/services/appeals";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { logAuthEvent } from "@/lib/structuredLogger/node";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
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
        logAuthEvent({
          action: "rbac_deny",
          path: `/api/office/appeals/${params.id}/comments`,
          role: session?.role ?? null,
          userId: session?.id ?? null,
          status: 401,
          latencyMs: Date.now() - startedAt,
          error: "UNAUTHORIZED",
        });
        return unauthorized(request);
      }
      if (error.message === "FORBIDDEN") {
        logAuthEvent({
          action: "rbac_deny",
          path: `/api/office/appeals/${params.id}/comments`,
          role: session?.role ?? null,
          userId: session?.id ?? null,
          status: 403,
          latencyMs: Date.now() - startedAt,
          error: "FORBIDDEN",
        });
        return forbidden(request);
      }
      if (error.message === "NOT_FOUND") {
        return fail(request, "not_found", "Обращение не найдено", 404);
      }
    }
    return serverError(request, "Ошибка при добавлении комментария", error);
  }
}
