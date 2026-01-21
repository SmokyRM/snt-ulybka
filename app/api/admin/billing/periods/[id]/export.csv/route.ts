import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { unauthorized, forbidden, fail } from "@/lib/api/respond";
import {
  findUnifiedBillingPeriodById,
  listPeriodAccruals,
  listPlots,
  listPayments,
} from "@/lib/mockDb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    return forbidden(request);
  }

  const { id } = await params;
  const period = findUnifiedBillingPeriodById(id);
  if (!period) {
    return fail(request, "not_found", "period not found", 404);
  }

  const accruals = listPeriodAccruals(period.id);
  const plots = listPlots();
  const payments = listPayments({ includeVoided: false });

  // Calculate paid amounts
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

  // Build CSV
  const rows: string[] = [];
  rows.push("\uFEFFУлица,Участок,Владелец,Тип,Начислено,Оплачено,Долг");

  accruals.forEach((accrual) => {
    const plot = plots.find((p) => p.id === accrual.plotId);
    const paid = paidByPlotAndType[accrual.plotId]?.[accrual.type] ?? 0;
    const debt = accrual.amountAccrued - paid;
    const typeLabel =
      accrual.type === "membership"
        ? "Членские"
        : accrual.type === "target"
          ? "Целевые"
          : "Электроэнергия";

    rows.push(
      [
        plot?.street ?? "",
        plot?.plotNumber ?? "",
        plot?.ownerFullName ?? "",
        typeLabel,
        accrual.amountAccrued.toFixed(2),
        paid.toFixed(2),
        debt.toFixed(2),
      ].join(",")
    );
  });

  // Add totals
  const totals = accruals.reduce(
    (acc, item) => {
      const paid = paidByPlotAndType[item.plotId]?.[item.type] ?? 0;
      acc.accrued += item.amountAccrued;
      acc.paid += paid;
      acc.debt += item.amountAccrued - paid;
      return acc;
    },
    { accrued: 0, paid: 0, debt: 0 }
  );

  rows.push("");
  rows.push(`ИТОГО,,,${totals.accrued.toFixed(2)},${totals.paid.toFixed(2)},${totals.debt.toFixed(2)}`);

  const csv = rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="period-${period.id}.csv"`,
    },
  });
}
