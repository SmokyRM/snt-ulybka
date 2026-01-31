/**
 * Penalty Recalc API
 * Sprint 23: Recalculate penalties using current outstanding debt
 */
import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { listAccrualsWithStatus, getPlotLabel } from "@/lib/billing.store";
import {
  listPenaltyAccruals,
  upsertPenaltyAccrual,
  PENALTY_POLICY_VERSION,
  type PenaltyAccrual,
} from "@/lib/penaltyAccruals.store";
import { logAuditEvent, generateRequestId } from "@/lib/auditLog.store";
import type { Role } from "@/lib/permissions";
import { assertPeriodOpenOrReason } from "@/lib/office/periodClose.store";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.penalty.recalc", {
    route: "/api/office/billing/penalty/recalc",
    deniedReason: "billing.penalty.recalc",
  });
  if (guard instanceof Response) return guard;
  const { session, role } = guard;
  if (!session) {
    return fail(request, "unauthorized", "Требуется авторизация", 401);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const asOf = typeof body.asOf === "string" ? body.asOf : null;
    const rate = typeof body.rate === "number" ? body.rate : 0.1;
    const plotIds = Array.isArray(body.plotIds) ? body.plotIds : null;
    const limit = typeof body.limit === "number" ? body.limit : null;
    const includeVoided = body.includeVoided === true;
    const reason = typeof body.reason === "string" ? body.reason : null;

    if (!asOf) {
      return fail(request, "asOf_required", "asOf is required", 400);
    }

    const requestId = generateRequestId();
    const asOfDate = new Date(asOf);
    const period = asOf.slice(0, 7); // YYYY-MM
    let closeCheck: { closed: false } | { closed: true; reason: string };
    try {
      closeCheck = assertPeriodOpenOrReason(period, reason);
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }

    // Get current debts
    let debtRows = listAccrualsWithStatus().filter((row) => (row.remaining ?? 0) > 0);

    // Filter by plotIds if specified
    if (plotIds && plotIds.length > 0) {
      debtRows = debtRows.filter((row) => plotIds.includes(row.plotId));
    }

    // Apply limit
    if (limit && limit > 0) {
      debtRows = debtRows.slice(0, limit);
    }

    // Get existing penalty accruals for this period
    const existingPenalties = listPenaltyAccruals({ period });
    const existingByPlot = new Map<string, PenaltyAccrual>();
    existingPenalties.forEach((p) => {
      existingByPlot.set(p.plotId, p);
    });

    const results = {
      updated: 0,
      created: 0,
      skippedFrozen: 0,
      skippedVoided: 0,
      skippedZeroDebt: 0,
      sample: [] as Array<{
        plotId: string;
        plotLabel: string;
        oldAmount: number;
        newAmount: number;
        action: string;
      }>,
    };

    const ratePerDay = rate / 365;
    const processedPlotIds: string[] = [];

    // Group debts by plot
    const debtsByPlot: Record<string, { totalDebt: number; daysOverdue: number }> = {};
    debtRows.forEach((row) => {
      if (!debtsByPlot[row.plotId]) {
        debtsByPlot[row.plotId] = { totalDebt: 0, daysOverdue: 0 };
      }
      const daysOverdue = Math.max(0, Math.floor((asOfDate.getTime() - new Date(row.date).getTime()) / 86400000));
      debtsByPlot[row.plotId].totalDebt += row.remaining ?? 0;
      debtsByPlot[row.plotId].daysOverdue = Math.max(debtsByPlot[row.plotId].daysOverdue, daysOverdue);
    });

    // Process each plot
    for (const [plotId, debtInfo] of Object.entries(debtsByPlot)) {
      const existingPenalty = existingByPlot.get(plotId);
      const newAmount = Math.round(debtInfo.totalDebt * rate * (debtInfo.daysOverdue / 365));

      // Skip if voided (unless explicitly requested)
      if (existingPenalty?.status === "voided" && !includeVoided) {
        results.skippedVoided += 1;
        continue;
      }

      // Skip if frozen
      if (existingPenalty?.status === "frozen") {
        results.skippedFrozen += 1;
        continue;
      }

      // Skip if zero debt
      if (newAmount <= 0) {
        results.skippedZeroDebt += 1;
        continue;
      }

      const oldAmount = existingPenalty?.amount ?? 0;
      const upsertResult = upsertPenaltyAccrual({
        plotId,
        period,
        amount: newAmount,
        metadata: {
          asOf,
          ratePerDay,
          baseDebt: debtInfo.totalDebt,
          daysOverdue: debtInfo.daysOverdue,
          policyVersion: PENALTY_POLICY_VERSION,
        },
        createdBy: session.id,
      });

      if (upsertResult.action === "created") {
        results.created += 1;
      } else if (upsertResult.action === "updated") {
        results.updated += 1;
      } else if (upsertResult.action === "skipped" && upsertResult.skipReason === "frozen") {
        results.skippedFrozen += 1;
        continue;
      }

      processedPlotIds.push(plotId);

      // Add to sample (max 5)
      if (results.sample.length < 5) {
        results.sample.push({
          plotId,
          plotLabel: getPlotLabel(plotId),
          oldAmount,
          newAmount,
          action: upsertResult.action,
        });
      }
    }

    // Log audit event
    logAuditEvent({
      action: "penalty.recalc",
      actorId: session.id,
      actorRole: role,
      requestId,
      targetType: "penalty_accrual",
      targetIds: processedPlotIds,
      details: {
        asOf,
        rate,
        period,
        updated: results.updated,
        created: results.created,
        skippedFrozen: results.skippedFrozen,
        skippedVoided: results.skippedVoided,
        postCloseChange: closeCheck.closed,
        reason: closeCheck.closed ? closeCheck.reason : null,
      },
    });

    return ok(request, {
      results,
      summary: {
        processed: results.updated + results.created,
        updated: results.updated,
        created: results.created,
        skipped: results.skippedFrozen + results.skippedVoided + results.skippedZeroDebt,
        frozen: results.skippedFrozen,
        voided: results.skippedVoided,
        zeroDebt: results.skippedZeroDebt,
      },
      config: {
        asOf,
        rate,
        period,
        policyVersion: PENALTY_POLICY_VERSION,
      },
    });
  } catch (error) {
    return serverError(request, "Ошибка пересчёта пени", error);
  }
}
