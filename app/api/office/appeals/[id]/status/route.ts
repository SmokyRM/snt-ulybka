import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { updateAppealStatus } from "@/server/services/appeals";
import type { AppealStatus } from "@/lib/office/types";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { logAuthEvent } from "@/lib/structuredLogger/node";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  try {
    const body = await request.json().catch(() => ({}));
    const rawStatus = body.status as string | undefined;
    const status = (rawStatus === "done" ? "closed" : rawStatus) as AppealStatus | undefined;
    const comment = typeof body.comment === "string" ? body.comment : undefined;

    if (!status || (status !== "new" && status !== "in_progress" && status !== "needs_info" && status !== "closed")) {
      return fail(request, "validation_error", "Неверный статус обращения", 400);
    }

    const appeal = await updateAppealStatus(params.id, { status, comment });
    return ok(request, { appeal });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        logAuthEvent({
          action: "rbac_deny",
          path: `/api/office/appeals/${params.id}/status`,
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
          path: `/api/office/appeals/${params.id}/status`,
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
    return serverError(request, "Ошибка при обновлении статуса обращения", error);
  }
}
