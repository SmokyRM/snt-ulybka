import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { unauthorized, forbidden, fail } from "@/lib/api/respond";
import { findUnifiedBillingPeriodById, listPeriodAccruals, listPlots } from "@/lib/mockDb";
import { buildPeriodReconciliation } from "@/lib/billing/unifiedReconciliation.server";
import { NextResponse } from "next/server";

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

  const reconciliation = buildPeriodReconciliation(period);
  const plots = listPlots();
  const plotMap = new Map(plots.map((plot) => [plot.id, plot]));
  const accruals = listPeriodAccruals(period.id);
  const accrualMap = new Map(accruals.map((a) => [`${a.plotId}:${a.type}`, a]));

  // Build CSV
  const rows: string[] = [];
  rows.push("\uFEFFУлица,Участок,Владелец,Тип,Начислено,Оплачено,Долг");

  reconciliation.rows.forEach((row) => {
    (["membership", "target", "electric"] as const).forEach((type) => {
      const accrual = accrualMap.get(`${row.plotId}:${type}`) ?? null;
      const byType = row.byType[type];
      if (!accrual && byType.accrued === 0 && byType.paid === 0) return;
      const plot = plotMap.get(row.plotId);
      const typeLabel =
        type === "membership" ? "Членские" : type === "target" ? "Целевые" : "Электроэнергия";
      const accrued = accrual?.amountAccrued ?? 0;
      const paid = byType.paid;
      const debt = accrued - paid;

      rows.push(
        [
          plot?.street ?? "",
          plot?.plotNumber ?? "",
          plot?.ownerFullName ?? "",
          typeLabel,
          accrued.toFixed(2),
          paid.toFixed(2),
          debt.toFixed(2),
        ].join(",")
      );
    });
  });

  // Add totals
  const totals = reconciliation.totals;

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
