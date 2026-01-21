import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";
import {
  findUnifiedBillingPeriodById,
  listPlots,
  listFeeTariffs,
  getEffectiveTariffAmount,
  findFeeTariffOverride,
  listPeriodAccruals,
  ensurePeriodAccrual,
  updatePeriodAccrual,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

/** Создать начисления по участкам (membership + target). Если уже есть — 409 без force. Admin + office. */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const body = await request.json().catch(() => ({}));
    const periodId = typeof body.periodId === "string" ? body.periodId : null;
    const force = body.force === true;

    if (!periodId) {
      return badRequest(request, "periodId required");
    }

    const period = findUnifiedBillingPeriodById(periodId);
    if (!period) return fail(request, "not_found", "Период не найден", 404);

    if (period.status === "locked") {
      return badRequest(request, "Период зафиксирован. Снимите фиксацию.");
    }

    const existing = listPeriodAccruals(periodId);
    if (existing.length > 0 && !force) {
      return fail(request, "accruals_exist", "Для периода уже есть начисления. Отправьте force: true для перезаписи.", 409);
    }

    const plots = listPlots().filter((p) => p.status !== "archived");
    if (plots.length === 0) {
      return badRequest(request, "Пустой реестр участков");
    }

  const mid =
    period.from && period.to
      ? new Date((new Date(period.from).getTime() + new Date(period.to).getTime()) / 2)
          .toISOString()
          .slice(0, 10)
      : period.from.slice(0, 7) + "-15";

  const activeTariffs = listFeeTariffs({ activeAt: mid }).filter((t) => t.status !== "draft");
  const membershipTariff = activeTariffs.find((t) => t.type === "member");
  const targetTariff = activeTariffs.find((t) => t.type === "target");

    if (!membershipTariff && !targetTariff) {
      return badRequest(request, "Нет активного тарифа (member или target) на дату периода");
    }

  let created = 0;

  for (const plot of plots) {
    const plotArea = plot.area ?? null;

    if (membershipTariff) {
      const raw = getEffectiveTariffAmount(membershipTariff.id, plot.id, plotArea);
      const amount = raw ?? 0;
      const overrideApplied = !!findFeeTariffOverride(membershipTariff.id, plot.id);
      const accrual = ensurePeriodAccrual(periodId, plot.id, "membership");
      updatePeriodAccrual(accrual.id, {
        amountAccrued: amount,
        overrideApplied,
        note: raw === null ? "needs_review" : null,
      });
      created++;
    }

    if (targetTariff) {
      const raw = getEffectiveTariffAmount(targetTariff.id, plot.id, plotArea);
      const amount = raw ?? 0;
      const overrideApplied = !!findFeeTariffOverride(targetTariff.id, plot.id);
      const accrual = ensurePeriodAccrual(periodId, plot.id, "target");
      updatePeriodAccrual(accrual.id, {
        amountAccrued: amount,
        overrideApplied,
        note: raw === null ? "needs_review" : null,
      });
      created++;
    }
  }

    await logAdminAction({
      action: "accruals_generate_apply",
      entity: "unified_billing_period",
      entityId: periodId,
      after: { plotCount: plots.length, accrualRows: created, force },
      headers: request.headers,
    });

    return ok(request, {
      periodId,
      created,
      plotCount: plots.length,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
