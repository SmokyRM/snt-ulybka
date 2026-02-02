import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { createOfficeJob, listOfficeJobs } from "@/lib/office/jobs.store";
import { enqueueOfficeJob, getJobPermissionAction } from "@/lib/office/jobs.server";
import type { OfficeJobType } from "@/lib/office/jobs.store";
import { logAdminAction } from "@/lib/audit";
import { getRequestId } from "@/lib/api/requestId";

const allowedTypes: OfficeJobType[] = [
  "receipts.batch",
  "receipts.batchPdf",
  "payments.import.csv",
  "payments.import.xlsx",
  "billing.importStatement",
  "reports.monthlyPdfBatch",
  "notifications.campaignSend",
  "notifications.send",
];

const canAccessJobType = (role: Role | null | undefined, type: OfficeJobType) => {
  if (!role) return false;
  return hasPermission(role, getJobPermissionAction(type));
};

const sanitizeJob = (job: Awaited<ReturnType<typeof listOfficeJobs>>[number]) => {
  const { payload, ...rest } = job;
  return rest;
};

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/jobs",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    await logAdminAction({
      action: "rbac.deny",
      entity: "office.jobs",
      route: "/api/office/jobs",
      success: false,
      deniedReason: "UNAUTHORIZED",
      headers: request.headers,
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/jobs",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    await logAdminAction({
      action: "rbac.deny",
      entity: "office.jobs",
      route: "/api/office/jobs",
      success: false,
      deniedReason: "FORBIDDEN",
      headers: request.headers,
    });
    return forbidden(request);
  }

  const allowed = allowedTypes.filter((type) => canAccessJobType(role, type));
  if (allowed.length === 0) {
    await logAdminAction({
      action: "rbac.deny",
      entity: "office.jobs",
      route: "/api/office/jobs",
      success: false,
      deniedReason: "FORBIDDEN",
      headers: request.headers,
    });
    return forbidden(request);
  }

  const items = (await listOfficeJobs())
    .filter((job) => allowed.includes(job.type))
    .map(sanitizeJob);
  return ok(request, { items });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/jobs",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    await logAdminAction({
      action: "rbac.deny",
      entity: "office.jobs",
      route: "/api/office/jobs",
      success: false,
      deniedReason: "UNAUTHORIZED",
      headers: request.headers,
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/jobs",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    await logAdminAction({
      action: "rbac.deny",
      entity: "office.jobs",
      route: "/api/office/jobs",
      success: false,
      deniedReason: "FORBIDDEN",
      headers: request.headers,
    });
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => null);
    const type = body?.type as OfficeJobType | undefined;
    const payload = body?.payload as Record<string, unknown> | undefined;

    if (!type || !allowedTypes.includes(type)) {
      return badRequest(request, "Неверный тип задания");
    }

    if (!canAccessJobType(role, type)) {
      await logAdminAction({
        action: "rbac.deny",
        entity: "office.jobs",
        route: "/api/office/jobs",
        success: false,
        deniedReason: "FORBIDDEN",
        headers: request.headers,
      });
      return forbidden(request);
    }

    const job = await createOfficeJob({
      type,
      payload: payload ?? {},
      createdBy: session.id ?? null,
      requestId: getRequestId(request),
    });

    enqueueOfficeJob(job.id);

    await logAdminAction({
      action: "job.start",
      entity: type,
      entityId: job.id,
      route: "/api/office/jobs",
      success: true,
      meta: { type },
      headers: request.headers,
    });

    return ok(request, { jobId: job.id });
  } catch (error) {
    return serverError(request, "Ошибка запуска задания", error);
  }
}
