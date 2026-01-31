import { ok, unauthorized, forbidden, badRequest, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { hasPermission } from "@/lib/permissions";
import { buildMonthlyAggregates } from "@/lib/office/reporting";
import { listAppeals as listAppealsStore } from "@/lib/appeals.store";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/dashboard/summary",
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
      path: "/api/office/dashboard/summary",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  if (!(role === "admin" || role === "chairman" || role === "accountant" || hasPermission(role, "billing.export"))) {
    return forbidden(request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    if (period && !/^\d{4}-\d{2}$/.test(period)) {
      return badRequest(request, "Неверный формат period");
    }
    const targetPeriod = period ?? new Date().toISOString().slice(0, 7);
    const aggregates = buildMonthlyAggregates(targetPeriod, targetPeriod);
    const summary = aggregates[0];

    const appeals = listAppealsStore().filter((appeal) => appeal.createdAt.slice(0, 7) === targetPeriod);
    const appealsNew = appeals.filter((a) => a.status === "new").length;
    const appealsInProgress = appeals.filter((a) => a.status === "in_progress").length;

    return ok(request, {
      period: targetPeriod,
      billing: {
        accrued: summary?.accrued ?? 0,
        paid: summary?.paid ?? 0,
        debtEnd: summary?.debtEnd ?? 0,
        paymentsCount: summary?.paymentsCount ?? 0,
      },
      appeals: {
        new: appealsNew,
        inProgress: appealsInProgress,
      },
    });
  } catch (error) {
    return serverError(request, "Ошибка загрузки дашборда", error);
  }
}
