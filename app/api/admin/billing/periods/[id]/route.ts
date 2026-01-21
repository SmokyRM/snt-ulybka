import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import { findUnifiedBillingPeriodById, listPeriodAccruals, listPlots, listPayments } from "@/lib/mockDb";
import { categoryForAccrualType } from "@/lib/paymentCategory";
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

  const accruals = listPeriodAccruals(period.id);
  const plots = listPlots();
  const payments = listPayments({ includeVoided: false });

  // Calculate paid amounts by plot and type
  const paidByPlotAndType: Record<string, Record<"membership" | "target" | "electric", number>> = {};
  payments.forEach((p) => {
    if (!p.periodId || p.periodId !== period.id) return;
    const category = p.category;
    let type: "membership" | "target" | "electric" | null = null;
    if (category === "membership_fee") type = "membership";
    else if (category === "target_fee") type = "target";
    else if (category === "electricity") type = "electric";
    if (!type) return;

    if (!paidByPlotAndType[p.plotId]) {
      paidByPlotAndType[p.plotId] = { membership: 0, target: 0, electric: 0 };
    }
    paidByPlotAndType[p.plotId][type] = (paidByPlotAndType[p.plotId][type] ?? 0) + p.amount;
  });

  // Enrich accruals with plot info and paid amounts
  const enriched = accruals.map((accrual) => {
    const plot = plots.find((p) => p.id === accrual.plotId);
    const paid = paidByPlotAndType[accrual.plotId]?.[accrual.type] ?? 0;
    return {
      ...accrual,
      plot: plot
        ? {
            id: plot.id,
            plotNumber: plot.plotNumber,
            street: plot.street,
            ownerFullName: plot.ownerFullName,
          }
        : null,
      amountPaid: paid,
      debt: accrual.amountAccrued - paid,
    };
  });

  // Calculate totals
  const totals = enriched.reduce(
    (acc, item) => {
      acc.accrued += item.amountAccrued;
      acc.paid += item.amountPaid;
      acc.debt += item.debt;
      return acc;
    },
    { accrued: 0, paid: 0, debt: 0 }
  );

  // Group by type
  const byType = {
    membership: enriched.filter((a) => a.type === "membership"),
    target: enriched.filter((a) => a.type === "target"),
    electric: enriched.filter((a) => a.type === "electric"),
  };

  const totalsByType = {
    membership: byType.membership.reduce((acc, item) => {
      acc.accrued += item.amountAccrued;
      acc.paid += item.amountPaid;
      acc.debt += item.debt;
      return acc;
    }, { accrued: 0, paid: 0, debt: 0 }),
    target: byType.target.reduce((acc, item) => {
      acc.accrued += item.amountAccrued;
      acc.paid += item.amountPaid;
      acc.debt += item.debt;
      return acc;
    }, { accrued: 0, paid: 0, debt: 0 }),
    electric: byType.electric.reduce((acc, item) => {
      acc.accrued += item.amountAccrued;
      acc.paid += item.amountPaid;
      acc.debt += item.debt;
      return acc;
    }, { accrued: 0, paid: 0, debt: 0 }),
  };

    return ok(request, {
      period,
      accruals: enriched,
      totals,
      totalsByType,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
