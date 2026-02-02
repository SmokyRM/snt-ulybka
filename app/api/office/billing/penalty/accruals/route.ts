export const runtime = "nodejs";

/**
 * Penalty Accruals List API
 * Sprint 23: List penalty accruals with metadata and status
 */
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { getPlotLabel } from "@/lib/billing.store";
import {
  hasPgConnection,
  listPenaltyAccruals as listPenaltyAccrualsPg,
  getPenaltyAccrualsSummary as getPenaltyAccrualsSummaryPg,
} from "@/lib/billing/penalty.pg";
import {
  listPenaltyAccruals,
  getPenaltyAccrualsSummary,
  type PenaltyAccrual,
  type PenaltyAccrualStatus,
} from "@/lib/penaltyAccruals.store";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/penalty/accruals",
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
      path: "/api/office/billing/penalty/accruals",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as PenaltyAccrualStatus | null;
    const period = searchParams.get("period");
    const plotId = searchParams.get("plotId");

    let accruals, summary;
    if (hasPgConnection()) {
      // Use PG layer
      accruals = await listPenaltyAccrualsPg({
        status: status || null,
        period: period || null,
        plotId: plotId || null,
      });
      summary = await getPenaltyAccrualsSummaryPg({ period: period || undefined });
    } else {
      // Fallback to in-memory store
      accruals = listPenaltyAccruals({
        status: status || undefined,
        period: period || undefined,
        plotId: plotId || undefined,
      });
      summary = getPenaltyAccrualsSummary({ period: period || undefined });
    }

    // Enrich with plot labels
    const enriched = accruals.map((a: PenaltyAccrual) => ({
      ...a,
      plotLabel: getPlotLabel(a.plotId),
    }));

    return ok(request, { accruals: enriched, summary });
  } catch (error) {
    return serverError(request, "Ошибка получения начислений пени", error);
  }
}
