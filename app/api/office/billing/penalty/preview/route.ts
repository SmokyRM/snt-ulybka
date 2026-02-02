export const runtime = "nodejs";

import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listAccrualsWithStatus, getPlotLabel } from "@/lib/billing.store";
import { hasPgConnection, previewPenalty } from "@/lib/billing/penalty.pg";

export type PenaltyPreviewRow = {
  plotId: string;
  plotLabel: string;
  period: string;
  originalAmount: number;
  remaining: number;
  daysOverdue: number;
  penaltyAmount: number;
  date: string;
};

type AccrualWithStatus = ReturnType<typeof listAccrualsWithStatus>[number];

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/penalty/preview",
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
      path: "/api/office/billing/penalty/preview",
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
    const asOf = typeof body.asOf === "string" ? body.asOf : new Date().toISOString().slice(0, 10);
    const rate = typeof body.rate === "number" ? body.rate : 0.1;
    const from = typeof body.from === "string" ? body.from : null;
    const to = typeof body.to === "string" ? body.to : null;
    const minPenalty = typeof body.minPenalty === "number" ? body.minPenalty : 0;

    let previewRows: PenaltyPreviewRow[] = [];
    let totalPenalty = 0;

    if (hasPgConnection()) {
      const preview = await previewPenalty({ asOf, rate, from, to, minPenalty });
      previewRows = preview.rows.map((row) => ({
        plotId: row.plotId,
        plotLabel: row.plotLabel ?? "—",
        period: row.period ?? "",
        originalAmount: row.originalAmount ?? 0,
        remaining: row.remaining ?? 0,
        daysOverdue: row.daysOverdue,
        penaltyAmount: row.penaltyAmount,
        date: row.date,
      }));
      totalPenalty = preview.totalPenalty;
    } else {
      const asOfDate = new Date(asOf);
      let rows: AccrualWithStatus[] = listAccrualsWithStatus().filter((row: AccrualWithStatus) => (row.remaining ?? 0) > 0);
      if (from) {
        const fromTs = new Date(from).getTime();
        rows = rows.filter((row: AccrualWithStatus) => new Date(row.date).getTime() >= fromTs);
      }
      if (to) {
        const toTs = new Date(to).getTime();
        rows = rows.filter((row: AccrualWithStatus) => new Date(row.date).getTime() <= toTs);
      }

      previewRows = rows
        .map((row: AccrualWithStatus) => {
          const daysOverdue = Math.max(
            0,
            Math.floor((asOfDate.getTime() - new Date(row.date).getTime()) / 86400000)
          );
          const penaltyAmount = Math.round((row.remaining ?? 0) * rate * (daysOverdue / 365));
          return {
            plotId: row.plotId,
            plotLabel: getPlotLabel(row.plotId),
            period: row.period ?? "",
            originalAmount: row.amount,
            remaining: row.remaining ?? 0,
            daysOverdue,
            penaltyAmount,
            date: row.date,
          };
        })
        .filter((row) => row.penaltyAmount >= minPenalty);

      totalPenalty = previewRows.reduce((sum, row) => sum + row.penaltyAmount, 0);
    }

    const affectedPlots = new Set(previewRows.map((row) => row.plotId)).size;

    return ok(request, {
      rows: previewRows,
      summary: {
        totalPenalty,
        affectedPlots,
        rowCount: previewRows.length,
        asOf,
        rate,
      },
    });
  } catch (error) {
    return serverError(request, "Ошибка предпросмотра пени", error);
  }
}
