export const runtime = "nodejs";

/**
 * Penalty Apply API
 * Sprint 23: Updated to create penalty accruals with metadata and audit logging
 */
import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { listAccrualsWithStatus, getPlotLabel, addCharge } from "@/lib/billing.store";
import {
  upsertPenaltyAccrual,
  PENALTY_POLICY_VERSION,
} from "@/lib/penaltyAccruals.store";
import {
  hasPgConnection,
  previewPenalty,
  upsertPenaltyAccrual as upsertPenaltyAccrualPg,
} from "@/lib/billing/penalty.pg";
import { logAuditEvent, generateRequestId } from "@/lib/auditLog.store";
import type { Role } from "@/lib/permissions";
import { assertPeriodOpenOrReason } from "@/lib/office/periodClose.store";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.penalty.apply", {
    route: "/api/office/billing/penalty/apply",
    deniedReason: "billing.penalty.apply",
  });
  if (guard instanceof Response) return guard;
  const { session, role } = guard;
  if (!session) {
    return fail(request, "unauthorized", "Требуется авторизация", 401);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const asOf = typeof body.asOf === "string" ? body.asOf : new Date().toISOString().slice(0, 10);
    const rate = typeof body.rate === "number" ? body.rate : 0.1;
    const from = typeof body.from === "string" ? body.from : null;
    const to = typeof body.to === "string" ? body.to : null;
    const minPenalty = typeof body.minPenalty === "number" ? body.minPenalty : 0;
    const reason = typeof body.reason === "string" ? body.reason : null;

    const requestId = generateRequestId();
    const asOfDate = new Date(asOf);
    const period = asOf.slice(0, 7); // YYYY-MM
    let closeCheck: { closed: false } | { closed: true; reason: string };
    try {
      closeCheck = assertPeriodOpenOrReason(period, reason);
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }
    const ratePerDay = rate / 365;

    let createdCount = 0;
    let totalPenalty = 0;
    const penaltyCharges: Array<{ plotId: string; plotLabel: string; amount: number }> = [];
    const createdIds: string[] = [];

    if (hasPgConnection()) {
      const preview = await previewPenalty({ asOf, rate, from, to, minPenalty });
      const penaltiesByPlot: Record<
        string,
        { amount: number; baseDebt: number; daysOverdue: number; plotLabel: string }
      > = {};

      preview.rows.forEach((row: {
        plotId: string;
        plotLabel: string;
        remaining: number;
        daysOverdue: number;
        penaltyAmount: number;
      }) => {
        if (!penaltiesByPlot[row.plotId]) {
          penaltiesByPlot[row.plotId] = {
            amount: 0,
            baseDebt: 0,
            daysOverdue: 0,
            plotLabel: row.plotLabel ?? "—",
          };
        }
        penaltiesByPlot[row.plotId].amount += row.penaltyAmount;
        penaltiesByPlot[row.plotId].baseDebt += row.remaining ?? 0;
        penaltiesByPlot[row.plotId].daysOverdue = Math.max(penaltiesByPlot[row.plotId].daysOverdue, row.daysOverdue);
      });

      for (const [plotId, penaltyData] of Object.entries(penaltiesByPlot)) {
        if (penaltyData.amount <= 0) continue;

        const upsertResult = await upsertPenaltyAccrualPg({
          plotId,
          period,
          amount: penaltyData.amount,
          metadata: {
            asOf,
            ratePerDay,
            baseDebt: penaltyData.baseDebt,
            daysOverdue: penaltyData.daysOverdue,
            policyVersion: PENALTY_POLICY_VERSION,
          },
          createdBy: session.id,
        });

        createdCount += 1;
        totalPenalty += penaltyData.amount;
        penaltyCharges.push({
          plotId,
          plotLabel: penaltyData.plotLabel,
          amount: penaltyData.amount,
        });
        createdIds.push(upsertResult.accrual.id);
      }
    } else {
      let rows = listAccrualsWithStatus().filter((row) => (row.remaining ?? 0) > 0);
      if (from) {
        const fromTs = new Date(from).getTime();
        rows = rows.filter((row) => new Date(row.date).getTime() >= fromTs);
      }
      if (to) {
        const toTs = new Date(to).getTime();
        rows = rows.filter((row) => new Date(row.date).getTime() <= toTs);
      }

      const penaltiesByPlot: Record<string, { amount: number; baseDebt: number; daysOverdue: number }> = {};
      rows.forEach((row) => {
        const daysOverdue = Math.max(0, Math.floor((asOfDate.getTime() - new Date(row.date).getTime()) / 86400000));
        const penaltyAmount = Math.round((row.remaining ?? 0) * rate * (daysOverdue / 365));
        if (penaltyAmount >= minPenalty) {
          if (!penaltiesByPlot[row.plotId]) {
            penaltiesByPlot[row.plotId] = { amount: 0, baseDebt: 0, daysOverdue: 0 };
          }
          penaltiesByPlot[row.plotId].amount += penaltyAmount;
          penaltiesByPlot[row.plotId].baseDebt += row.remaining ?? 0;
          penaltiesByPlot[row.plotId].daysOverdue = Math.max(penaltiesByPlot[row.plotId].daysOverdue, daysOverdue);
        }
      });

      Object.entries(penaltiesByPlot).forEach(([plotId, penaltyData]) => {
        if (penaltyData.amount > 0) {
          addCharge({
            plotId,
            residentId: "unknown",
            title: "Пени",
            amount: penaltyData.amount,
            date: asOf,
            period,
            category: "target",
          });

          const upsertResult = upsertPenaltyAccrual({
            plotId,
            period,
            amount: penaltyData.amount,
            metadata: {
              asOf,
              ratePerDay,
              baseDebt: penaltyData.baseDebt,
              daysOverdue: penaltyData.daysOverdue,
              policyVersion: PENALTY_POLICY_VERSION,
            },
            createdBy: session.id,
          });

          createdCount += 1;
          totalPenalty += penaltyData.amount;
          penaltyCharges.push({
            plotId,
            plotLabel: getPlotLabel(plotId),
            amount: penaltyData.amount,
          });
          createdIds.push(upsertResult.accrual.id);
        }
      });
    }

    // Log audit event
    logAuditEvent({
      action: "penalty.apply",
      actorId: session.id,
      actorRole: role,
      requestId,
      targetType: "penalty_accrual",
      targetIds: createdIds,
      details: {
        asOf,
        rate,
        period,
        createdCount,
        totalPenalty,
        policyVersion: PENALTY_POLICY_VERSION,
        postCloseChange: closeCheck.closed,
        reason: closeCheck.closed ? closeCheck.reason : null,
      },
    });

    return ok(request, {
      createdCount,
      totalPenalty,
      period,
      charges: penaltyCharges,
    });
  } catch (error) {
    return serverError(request, "Ошибка создания начислений пени", error);
  }
}
