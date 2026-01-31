import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { logAdminAction } from "@/lib/audit";
import { linkAppealToWork } from "@/lib/office/works.store";

const canEdit = (role: Role) => role === "admin" || role === "chairman";

export async function POST(request: Request, context: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/works/[id]/link-appeal",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role) || !canEdit(role)) {
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const appealId = typeof body.appealId === "string" ? body.appealId : null;
    const action = body.action === "unlink" ? "unlink" : "link";
    if (!appealId) {
      return badRequest(request, "appealId обязателен");
    }

    const updated = linkAppealToWork(context.params.id, appealId, action);
    if (!updated) {
      return badRequest(request, "Работа не найдена");
    }

    await logAdminAction({
      action: "work.link_appeal",
      entity: "work",
      entityId: context.params.id,
      route: "/api/office/works/[id]/link-appeal",
      success: true,
      meta: { appealId, action },
      headers: request.headers,
    });

    return ok(request, { record: updated });
  } catch (error) {
    return serverError(request, "Ошибка связи с обращением", error);
  }
}
