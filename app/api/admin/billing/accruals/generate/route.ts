import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, normalizeRole } from "@/lib/rbac";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";
import {
  findUnifiedBillingPeriodById,
  listFeeTariffs,
  findFeeTariffById,
  findFeeTariffOverride,
  getEffectiveTariffAmount,
  listPlots,
  listPeriodAccruals,
  ensurePeriodAccrual,
  updatePeriodAccrual,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { assertPeriodEditable } from "@/lib/billing/unifiedPolicy";

/** Рассчитать начисления: активный или выбранный тариф, overrides, участки из реестра. Только admin. */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    const role = normalizeRole(user.role);
    if (!isAdminRole(role)) return forbidden(request);

    const body = await request.json().catch(() => ({}));
    const { periodId, tariffId: bodyTariffId } = body;

    if (!periodId || typeof periodId !== "string") {
      return badRequest(request, "periodId required");
    }

    const period = findUnifiedBillingPeriodById(periodId);
    if (!period) return fail(request, "not_found", "Период не найден", 404);
    try {
      assertPeriodEditable(period);
    } catch {
      return fail(request, "period_closed", "Период закрыт. Изменения запрещены.", 409);
    }
    if (period.status === "locked") {
      return badRequest(request, "Период зафиксирован. Снимите фиксацию для пересчёта.");
    }

    const plots = listPlots();
    if (plots.length === 0) {
      return badRequest(request, "Пустой реестр участков");
    }

  const mid = `${period.from.slice(0, 7)}-15`;
  let tariff = bodyTariffId ? findFeeTariffById(bodyTariffId) : null;
  if (!tariff) {
    const candidates = listFeeTariffs({ activeAt: mid }).filter((t) => t.status !== "draft");
    tariff = candidates[0] ?? null;
  }
    if (!tariff) {
      return badRequest(request, "Нет активного тарифа. Укажите tariffId или создайте тариф.");
    }

  const type = tariff.type === "member" ? "membership" : "target";
  let needsReviewCount = 0;

  for (const plot of plots) {
    const amount = getEffectiveTariffAmount(tariff.id, plot.id, plot.area ?? null);
    const needsReview = amount === null;
    if (needsReview) needsReviewCount++;
    const overrideApplied = !!findFeeTariffOverride(tariff.id, plot.id);

    const accrual = ensurePeriodAccrual(periodId, plot.id, type);
    updatePeriodAccrual(accrual.id, {
      amountAccrued: amount ?? 0,
      overrideApplied,
      note: needsReview ? "needs_review" : null,
    });
  }

    const accruals = listPeriodAccruals(periodId, { type });

    await logAdminAction({
      action: "accruals_calculated",
      entity: "unified_billing_period",
      entityId: periodId,
      after: { tariffId: tariff.id, plotCount: accruals.length, needsReviewCount },
      headers: request.headers,
    });

    return ok(request, {
      periodId,
      tariffId: tariff.id,
      created: accruals.length,
      needsReview: needsReviewCount,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
