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
import { buildPeriodReconciliation } from "@/lib/billing/unifiedReconciliation.server";
import { logAdminAction } from "@/lib/audit";
import { assertPeriodEditable } from "@/lib/billing/unifiedPolicy";

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
  const reconciliation = buildPeriodReconciliation(period);
  const needsReviewCount = accruals.filter((a) => a.note === "needs_review").length;

  const byType = {
    membership: {
      count: accruals.filter((a) => a.type === "membership").length,
      accrued: reconciliation.totalsByType.membership.accrued,
      paid: reconciliation.totalsByType.membership.paid,
    },
    target: {
      count: accruals.filter((a) => a.type === "target").length,
      accrued: reconciliation.totalsByType.target.accrued,
      paid: reconciliation.totalsByType.target.paid,
    },
  };

  const plotRowsMap = new Map<
    string,
    { plotId: string; plotNumber: string; ownerName: string; membership: number; target: number }
  >();
  accruals.forEach((a) => {
    const plot = plotMap.get(a.plotId);
    if (!plotRowsMap.has(a.plotId)) {
      plotRowsMap.set(a.plotId, {
        plotId: a.plotId,
        plotNumber: plot?.plotNumber ?? a.plotId,
        ownerName: plot?.ownerFullName ?? "—",
        membership: 0,
        target: 0,
      });
    }
    const row = plotRowsMap.get(a.plotId)!;
    if (a.type === "membership") row.membership = a.amountAccrued;
    if (a.type === "target") row.target = a.amountAccrued;
  });
  const plotRows = Array.from(plotRowsMap.values());

  const paidByPlotType = new Map<string, { membership: number; target: number; electric: number }>();
  reconciliation.rows.forEach((row) => {
    paidByPlotType.set(row.plotId, {
      membership: row.byType.membership.paid,
      target: row.byType.target.paid,
      electric: row.byType.electric.paid,
    });
  });

  const plotData = accruals.map((a) => {
    const plot = plotMap.get(a.plotId);
    const paid = paidByPlotType.get(a.plotId)?.[a.type] ?? 0;
    return {
      plotId: a.plotId,
      street: plot?.street ?? "—",
      plotNumber: plot?.plotNumber ?? a.plotId,
      ownerName: plot?.ownerFullName ?? "—",
      amountAccrued: a.amountAccrued,
      amountPaid: paid,
      needsReview: a.note === "needs_review",
    };
  });

    return ok(request, {
      period,
      summary: {
        plotCount: accruals.length,
        totalAccrued: reconciliation.totals.accrued,
        totalPaid: reconciliation.totals.paid,
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
    try {
      assertPeriodEditable(period);
    } catch {
      return badRequest(request, "Период закрыт. Изменения запрещены.");
    }

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
