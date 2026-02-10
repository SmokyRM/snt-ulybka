export const runtime = "nodejs";

import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { generateAccruals, previewAccruals } from "@/lib/billing.store";
import {
  hasPgConnection,
  generateAccruals as generateAccrualsPg,
  generateAccrualsByRules as generateAccrualsByRulesPg,
  previewAccruals as previewAccrualsPg,
  previewAccrualsByRules as previewAccrualsByRulesPg,
} from "@/lib/billing/accruals.pg";
import { assertPeriodOpenOrReason } from "@/lib/office/periodClose.store";
import { logAdminAction } from "@/lib/audit";
import { createOfficeJob } from "@/lib/office/jobs.store";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/accruals/generate",
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
      path: "/api/office/billing/accruals/generate",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const period = typeof body.period === "string" ? body.period : null;
    const category = typeof body.category === "string" ? body.category : null;
    const tariff = typeof body.tariff === "number" ? body.tariff : body.tariff ? Number(body.tariff) : null;
    const fixedAmount = typeof body.fixedAmount === "number" ? body.fixedAmount : body.fixedAmount ? Number(body.fixedAmount) : null;
    const plotIds = Array.isArray(body.plotIds)
      ? body.plotIds.filter((id: unknown): id is string => typeof id === "string")
      : null;
    const plotQuery = typeof body.plotQuery === "string" ? body.plotQuery : null;
    const reason = typeof body.reason === "string" ? body.reason : null;
    const ruleIds = Array.isArray(body.ruleIds)
      ? body.ruleIds.filter((id: unknown): id is string => typeof id === "string")
      : null;
    const dryRun = Boolean(body.dryRun);

    if (!period) {
      return fail(request, "validation_error", "period обязателен", 400);
    }

    if (!ruleIds?.length) {
      if (!category) {
        return fail(request, "validation_error", "period и category обязательны", 400);
      }
      if (category !== "membership" && category !== "electricity" && category !== "target") {
        return fail(request, "validation_error", "Неверная категория", 400);
      }
    }

    let closeCheck: { closed: false } | { closed: true; reason: string };
    try {
      closeCheck = assertPeriodOpenOrReason(period, reason);
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }

    if (dryRun) {
      let rows: Array<{ plotId: string; plotLabel: string; amount: number; discount: number }> = [];
      if (ruleIds?.length) {
        if (hasPgConnection()) {
          const preview = await previewAccrualsByRulesPg({ period, ruleIds });
          rows = preview.rows;
        }
      } else if (category) {
        rows = hasPgConnection()
          ? await previewAccrualsPg({ period, category, tariff, fixedAmount, plotIds, plotQuery })
          : previewAccruals({ period, category, tariff, fixedAmount, plotIds, plotQuery });
      }
      const totalAmount = rows.reduce((sum: number, row) => sum + row.amount, 0);
      return ok(request, {
        dryRun: true,
        totals: { count: rows.length, totalAmount },
        rows: rows.slice(0, 5),
      });
    }

    const result = ruleIds?.length
      ? hasPgConnection()
        ? await generateAccrualsByRulesPg({ period, ruleIds })
        : { createdCount: 0, skippedCount: 0, duplicates: [] as string[] }
      : hasPgConnection()
      ? await generateAccrualsPg({ period, category: category!, tariff, fixedAmount, plotIds, plotQuery })
      : generateAccruals({ period, category: category!, tariff, fixedAmount, plotIds, plotQuery });

    const job = await createOfficeJob({
      type: "accruals.generate",
      payload: { period, category, ruleIds, createdCount: result.createdCount },
      createdBy: session.id ?? null,
    });

    await logAdminAction({
      action: "accruals.generate",
      entity: "billing.accruals",
      entityId: period,
      route: "/api/office/billing/accruals/generate",
      success: true,
      meta: closeCheck.closed
        ? { period, category, ruleIds, postCloseChange: true, reason: closeCheck.reason, jobId: job.id }
        : { period, category, ruleIds, jobId: job.id },
      headers: request.headers,
    });
    return ok(request, { ...result, jobId: job.id });
  } catch (error) {
    return serverError(request, "Ошибка генерации начислений", error);
  }
}
