import { getSessionUser } from "@/lib/session.server";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import { findUnifiedBillingPeriodById, listPeriodAccruals, listPlots } from "@/lib/mockDb";
import { buildPeriodReconciliation } from "@/lib/billing/unifiedReconciliation.server";
import { ok, unauthorized, forbidden, fail, serverError } from "@/lib/api/respond";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkAdminOrOfficeAccess(request);
    if (!accessCheck.allowed) {
      return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
    }

    const user = await getSessionUser();

    const { id } = await params;
    const period = findUnifiedBillingPeriodById(id);
    if (!period) {
      return fail(request, "not_found", "period not found", 404);
    }

    const reconciliation = buildPeriodReconciliation(period);
    const plots = listPlots();
    const plotMap = new Map(plots.map((plot) => [plot.id, plot]));
    const accruals = listPeriodAccruals(period.id);
    const accrualMap = new Map(accruals.map((a) => [`${a.plotId}:${a.type}`, a]));

    const enriched = reconciliation.rows.flatMap((row) => {
      return (["membership", "target", "electric"] as const).flatMap((type) => {
        const key = `${row.plotId}:${type}`;
        const accrual = accrualMap.get(key) ?? null;
        const byType = row.byType[type];
        if (!accrual && byType.accrued === 0 && byType.paid === 0) return [];

        const plot = plotMap.get(row.plotId);
        return [
          {
            id: accrual?.id ?? `virtual-${row.plotId}-${type}`,
            plotId: row.plotId,
            type,
            amountAccrued: accrual?.amountAccrued ?? 0,
            amountPaid: byType.paid,
            debt: (accrual?.amountAccrued ?? 0) - byType.paid,
            plot: plot
              ? {
                  id: plot.id,
                  plotNumber: plot.plotNumber,
                  street: plot.street,
                  ownerFullName: plot.ownerFullName,
                }
              : null,
          },
        ];
      });
    });

    return ok(request, {
      period,
      accruals: enriched,
      totals: reconciliation.totals,
      totalsByType: reconciliation.totalsByType,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
