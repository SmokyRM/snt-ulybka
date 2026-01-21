import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";
import {
  findUnifiedBillingPeriodById,
  updateUnifiedBillingPeriod,
  listPeriodAccruals,
  listPlots,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

/** Данные периода начислений: итог, по типам, по участкам. Admin + office. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const { periodId } = await params;
    const period = findUnifiedBillingPeriodById(periodId);
    if (!period) return fail(request, "not_found", "Период не найден", 404);

  const accruals = listPeriodAccruals(periodId);
  const plots = listPlots();
  const plotMap = new Map(plots.map((p) => [p.id, p]));

  const totalAccrued = accruals.reduce((s, a) => s + a.amountAccrued, 0);
  const totalPaid = accruals.reduce((s, a) => s + (a.amountPaid ?? 0), 0);
  const needsReviewCount = accruals.filter((a) => a.note === "needs_review").length;

  const byType = {
    membership: { count: 0, accrued: 0, paid: 0 },
    target: { count: 0, accrued: 0, paid: 0 },
  };
  accruals.forEach((a) => {
    if (a.type === "membership") {
      byType.membership.count++;
      byType.membership.accrued += a.amountAccrued;
      byType.membership.paid += a.amountPaid ?? 0;
    } else if (a.type === "target") {
      byType.target.count++;
      byType.target.accrued += a.amountAccrued;
      byType.target.paid += a.amountPaid ?? 0;
    }
  });

  const plotRowsMap = new Map<string, { plotId: string; plotNumber: string; ownerName: string; membership: number; target: number }>();
  accruals.forEach((a) => {
    const plot = plotMap.get(a.plotId);
    const key = a.plotId;
    if (!plotRowsMap.has(key)) {
      plotRowsMap.set(key, {
        plotId: a.plotId,
        plotNumber: plot?.plotNumber ?? a.plotId,
        ownerName: plot?.ownerFullName ?? "—",
        membership: 0,
        target: 0,
      });
    }
    const row = plotRowsMap.get(key)!;
    if (a.type === "membership") row.membership = a.amountAccrued;
    else if (a.type === "target") row.target = a.amountAccrued;
  });
  const plotRows = Array.from(plotRowsMap.values());

  const plotData = accruals.map((a) => {
    const plot = plotMap.get(a.plotId);
    return {
      plotId: a.plotId,
      street: plot?.street ?? "—",
      plotNumber: plot?.plotNumber ?? a.plotId,
      ownerName: plot?.ownerFullName ?? "—",
      amountAccrued: a.amountAccrued,
      needsReview: a.note === "needs_review",
    };
  });

    return ok(request, {
      period,
      summary: {
        plotCount: accruals.length,
        totalAccrued,
        totalPaid,
        needsReviewCount,
      },
      byType,
      plotRows,
      plotData,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

/** Зафиксировать (lock) / Снять фиксацию (unlock). Admin + office. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const { periodId } = await params;
    const period = findUnifiedBillingPeriodById(periodId);
    if (!period) return fail(request, "not_found", "Период не найден", 404);

    const body = await request.json().catch(() => ({}));
    const action = body.action === "lock" ? "lock" : body.action === "unlock" ? "unlock" : null;
    if (!action) return badRequest(request, "action: lock | unlock");

    if (action === "lock" && period.status !== "draft") {
      return badRequest(request, "Зафиксировать можно только период в черновике");
    }
    if (action === "unlock" && period.status !== "locked") {
      return badRequest(request, "Снять фиксацию можно только с зафиксированного периода");
    }

    const newStatus = action === "lock" ? "locked" : "draft";
    const updated = updateUnifiedBillingPeriod(periodId, {
      status: newStatus,
      updatedByUserId: user.id ?? null,
    });
    if (!updated) return serverError(request, "Не удалось обновить");

    await logAdminAction({
      action: action === "lock" ? "accrual_period_locked" : "accrual_period_unlocked",
      entity: "unified_billing_period",
      entityId: periodId,
      after: { status: newStatus },
      headers: request.headers,
    });

    return ok(request, { period: updated });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
