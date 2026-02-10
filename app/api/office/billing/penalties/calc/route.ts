export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { assertPeriodOpenOrReason } from "@/lib/office/periodClose.store";
import { logAdminAction } from "@/lib/audit";
import { getActivePenaltyRule, listPenaltyExceptions } from "@/lib/billing/penaltyRules.pg";
import { normalizePenaltyRate } from "@/lib/billing/penaltyCalc.logic";
import { previewPenalty, recalcByPeriod } from "@/lib/billing/penalty.pg";
import { hasPgConnection } from "@/lib/billing/penalty.pg";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.penalty.apply", {
    route: "/api/office/billing/penalties/calc",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const period = typeof body.period === "string" ? body.period : null;
    const dryRun = Boolean(body.dryRun);
    const asOf = typeof body.asOf === "string" ? body.asOf : new Date().toISOString().slice(0, 10);
    const reason = typeof body.reason === "string" ? body.reason : null;

    if (!period) {
      return fail(request, "validation_error", "period обязателен", 400);
    }

    let closeCheck: { closed: false } | { closed: true; reason: string };
    try {
      closeCheck = assertPeriodOpenOrReason(period, reason);
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }

    if (!hasPgConnection()) {
      if (dryRun) {
        return ok(request, { dryRun: true, totals: { count: 0, totalPenalty: 0 }, rows: [] });
      }
      return fail(request, "pg_missing", "Postgres не настроен", 503);
    }

    const rule = await getActivePenaltyRule(period);
    if (!rule) {
      return fail(request, "not_found", "Нет активных правил пени для периода", 404);
    }

    const exceptions = await listPenaltyExceptions(period);
    const excludedPlots = new Set(exceptions.map((exc) => exc.plotId).filter(Boolean) as string[]);
    const rate = normalizePenaltyRate(rule.rate, rule.rateType);

    const preview = await previewPenalty({ asOf, rate, from: null, to: null });
    const filteredRows = preview.rows.filter((row) => !excludedPlots.has(row.plotId));

    if (dryRun) {
      const totalPenalty = filteredRows.reduce((sum, row) => sum + row.penaltyAmount, 0);
      return ok(request, { dryRun: true, totals: { count: filteredRows.length, totalPenalty }, rows: filteredRows.slice(0, 5) });
    }

    const plotIds = filteredRows.map((row) => row.plotId);
    const result = await recalcByPeriod({
      period,
      asOf,
      rate,
      plotIds: plotIds.length ? plotIds : undefined,
      includeVoided: false,
      createdBy: guard.session.id ?? "",
    });

    await logAdminAction({
      action: "penalty.calc",
      entity: "billing.penalty",
      entityId: period,
      route: "/api/office/billing/penalties/calc",
      success: true,
      meta: closeCheck.closed ? { period, ruleId: rule.id, postCloseChange: true, reason: closeCheck.reason } : { period, ruleId: rule.id },
      headers: request.headers,
    });

    return ok(request, { dryRun: false, result });
  } catch (error) {
    return serverError(request, "Ошибка расчёта пени", error);
  }
}
