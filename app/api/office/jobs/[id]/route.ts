import { ok, unauthorized, forbidden, fail, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { getOfficeJob } from "@/lib/office/jobs.store";
import { getJobPermissionAction } from "@/lib/office/jobs.server";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request, context: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/jobs/[id]",
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
      path: "/api/office/jobs/[id]",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const job = await getOfficeJob(context.params.id);
    if (!job) {
      return fail(request, "not_found", "Задание не найдено", 404);
    }

    const permission = getJobPermissionAction(job.type);
    if (!hasPermission(role, permission)) {
      return forbidden(request);
    }

    const { payload, ...rest } = job;
    return ok(request, { job: rest });
  } catch (error) {
    return serverError(request, "Ошибка загрузки задания", error);
  }
}
