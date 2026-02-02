import { ok, unauthorized, forbidden, fail, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { getOfficeJob, updateOfficeJob } from "@/lib/office/jobs.store";
import { enqueueOfficeJob, getJobPermissionAction } from "@/lib/office/jobs.server";
import { hasPermission } from "@/lib/permissions";
import { logAdminAction } from "@/lib/audit";

const retryableTypes = new Set([
  "receipts.batch",
  "receipts.batchPdf",
  "payments.import.csv",
  "payments.import.xlsx",
  "billing.importStatement",
  "reports.monthlyPdfBatch",
  "notifications.campaignSend",
  "notifications.send",
]);

export async function POST(request: Request, context: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/jobs/[id]/retry",
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
      path: "/api/office/jobs/[id]/retry",
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

    if (!retryableTypes.has(job.type)) {
      return fail(request, "not_retryable", "Задание нельзя перезапустить", 409);
    }

    if (job.status !== "failed") {
      return fail(request, "not_failed", "Задание не в статусе ошибки", 409);
    }

    if (job.attempts >= job.maxAttempts) {
      return fail(request, "max_attempts", "Достигнут лимит попыток", 409);
    }

    const updated = await updateOfficeJob(job.id, { status: "queued", progress: 0, error: null });
    if (!updated) {
      return serverError(request, "Не удалось перезапустить задание");
    }

    enqueueOfficeJob(job.id);
    await logAdminAction({
      action: "job.retry",
      entity: job.type,
      entityId: job.id,
      route: "/api/office/jobs/[id]/retry",
      success: true,
      headers: request.headers,
      meta: { type: job.type },
    });

    return ok(request, { job: updated });
  } catch (error) {
    return serverError(request, "Ошибка перезапуска задания", error);
  }
}
