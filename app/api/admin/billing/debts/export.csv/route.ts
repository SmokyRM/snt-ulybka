import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import {
  listUnifiedBillingPeriods,
  listPlots,
  findDebtRepaymentPlanByPlotPeriod,
} from "@/lib/mockDb";
import { buildPeriodReconciliation } from "@/lib/billing/unifiedReconciliation.server";
import { unauthorized, forbidden } from "@/lib/api/respond";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

  const { searchParams } = new URL(request.url);
  const periodId = searchParams.get("periodId") || null;
  const onlyWithDebt = searchParams.get("onlyWithDebt") !== "false";
  const sortBy = searchParams.get("sortBy") === "debt_asc" ? "debt_asc" : "debt_desc";

  const statusOk = (s: string | undefined) => ["draft", "locked", "approved", "closed"].includes(s ?? "");
  const all = listUnifiedBillingPeriods();
  const periods = periodId ? all.filter((p) => p.id === periodId) : all.filter((p) => statusOk(p.status));

  if (periods.length === 0) {
    const csv = "\uFEFFУчасток,Улица,Владелец,Долг (членские),Долг (целевые),Долг (электро),Долг (всего),Статус плана,Комментарий\n";
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="debts.csv"' },
    });
  }

  const selectedPeriod = periods.sort((a, b) => b.from.localeCompare(a.from))[0];
  if (!selectedPeriod) {
    const csv = "\uFEFFУчасток,Улица,Владелец,Долг (членские),Долг (целевые),Долг (электро),Долг (всего),Статус плана,Комментарий\n";
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="debts.csv"' },
    });
  }

  const reconciliation = buildPeriodReconciliation(selectedPeriod);
  const plots = listPlots() ?? [];
  const plotMap = new Map(plots.map((plot) => [plot.id, plot]));

  type Row = { debtTotal: number; line: string };
  const built: Row[] = [];

  reconciliation.rows.forEach((row) => {
    const plot = plotMap.get(row.plotId);
    const debtMembership = Math.max(0, row.byType.membership.debt);
    const debtTarget = Math.max(0, row.byType.target.debt);
    const debtElectric = Math.max(0, row.byType.electric.debt);
    const debtTotal = debtMembership + debtTarget + debtElectric;

    if (onlyWithDebt && debtTotal <= 0) return;

    const repaymentPlan = plot ? findDebtRepaymentPlanByPlotPeriod(plot.id, selectedPeriod.id) : null;
    const statusLabel = repaymentPlan
      ? repaymentPlan.status === "pending"
        ? "В ожидании"
        : repaymentPlan.status === "agreed"
          ? "Договорённость"
          : repaymentPlan.status === "in_progress"
            ? "В процессе"
            : repaymentPlan.status === "completed"
              ? "Завершён"
              : "Отменён"
      : "—";
    const comment = (repaymentPlan?.comment ?? "").replace(/,/g, ";");

    built.push({
      debtTotal,
      line: [
        plot?.plotNumber ?? row.plotNumber ?? "",
        plot?.street ?? "",
        plot?.ownerFullName ?? "",
        debtMembership.toFixed(2),
        debtTarget.toFixed(2),
        debtElectric.toFixed(2),
        debtTotal.toFixed(2),
        statusLabel,
        comment,
      ].join(","),
    });
  });

    const sorted = [...built].sort((a, b) => (sortBy === "debt_asc" ? a.debtTotal - b.debtTotal : b.debtTotal - a.debtTotal));
    const csv = "\uFEFFУчасток,Улица,Владелец,Долг (членские),Долг (целевые),Долг (электро),Долг (всего),Статус плана,Комментарий\n" + sorted.map((r) => r.line).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="debts-${selectedPeriod.from}-${selectedPeriod.to}.csv"`,
      },
    });
  } catch (error) {
    // CSV endpoint - can't use serverError as it returns JSON
    return new NextResponse("Internal server error", { status: 500 });
  }
}
