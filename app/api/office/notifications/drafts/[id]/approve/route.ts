import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { approveNotificationDraft } from "@/lib/notificationDrafts.store";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: `/api/office/notifications/drafts/${params.id}/approve`,
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: `/api/office/notifications/drafts/${params.id}/approve`,
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const draft = approveNotificationDraft(params.id);
    if (!draft) {
      return fail(request, "not_found", "Уведомление не найдено", 404);
    }
    return ok(request, { draft });
  } catch (error) {
    return serverError(request, "Ошибка утверждения уведомления", error);
  }
}
