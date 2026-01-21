import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import {
  listUnifiedBillingPeriods,
  listPeriodAccruals,
  listPlots,
  listPayments,
  findDebtRepaymentPlanByPlotPeriod,
} from "@/lib/mockDb";
import type { PeriodAccrual } from "@/types/snt";
import { unauthorized, forbidden } from "@/lib/api/respond";

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

  const accruals = listPeriodAccruals(selectedPeriod.id) ?? [];
  const plots = listPlots() ?? [];
  const allPayments = listPayments({}) ?? [];

  const accrualsByPlot: Record<
    string,
    {
      membership: PeriodAccrual[];
      target: PeriodAccrual[];
      electric: PeriodAccrual[];
    }
  > = {};

  accruals.forEach((acc) => {
    if (!acc?.plotId) return;
    if (!accrualsByPlot[acc.plotId]) accrualsByPlot[acc.plotId] = { membership: [], target: [], electric: [] };
    if (acc.type === "membership") accrualsByPlot[acc.plotId].membership.push(acc);
    else if (acc.type === "target") accrualsByPlot[acc.plotId].target.push(acc);
    else if (acc.type === "electric") accrualsByPlot[acc.plotId].electric.push(acc);
  });

  const paymentsByPlot: Record<string, { membership: number; target: number; electric: number }> = {};

  accruals.forEach((acc) => {
    if (!acc?.plotId) return;
    if (!paymentsByPlot[acc.plotId]) paymentsByPlot[acc.plotId] = { membership: 0, target: 0, electric: 0 };
    if (acc.type === "membership") paymentsByPlot[acc.plotId].membership += acc.amountPaid ?? 0;
    else if (acc.type === "target") paymentsByPlot[acc.plotId].target += acc.amountPaid ?? 0;
    else if (acc.type === "electric") paymentsByPlot[acc.plotId].electric += acc.amountPaid ?? 0;
  });

  allPayments
    .filter((p) => p.plotId && p.periodId === selectedPeriod.id)
    .forEach((payment) => {
      const pid = payment.plotId!;
      if (!paymentsByPlot[pid]) paymentsByPlot[pid] = { membership: 0, target: 0, electric: 0 };
      if (payment.category === "membership" || payment.category === "membership_fee") paymentsByPlot[pid].membership += payment.amount;
      else if (payment.category === "target" || payment.category === "target_fee") paymentsByPlot[pid].target += payment.amount;
      else if (payment.category === "electricity" || payment.category === "electric") paymentsByPlot[pid].electric += payment.amount;
    });

  type Row = { debtTotal: number; line: string };
  const built: Row[] = [];

  (plots || []).forEach((plot) => {
    const plotAccruals = accrualsByPlot[plot.id] || { membership: [], target: [], electric: [] };
    const plotPayments = paymentsByPlot[plot.id] || { membership: 0, target: 0, electric: 0 };

    const debtMembership = Math.max(
      (plotAccruals.membership || []).reduce((s, a) => s + (a.amountAccrued ?? 0), 0) - (plotPayments.membership ?? 0),
      0
    );
    const debtTarget = Math.max(
      (plotAccruals.target || []).reduce((s, a) => s + (a.amountAccrued ?? 0), 0) - (plotPayments.target ?? 0),
      0
    );
    const debtElectric = Math.max(
      (plotAccruals.electric || []).reduce((s, a) => s + (a.amountAccrued ?? 0), 0) - (plotPayments.electric ?? 0),
      0
    );
    const debtTotal = debtMembership + debtTarget + debtElectric;

    if (onlyWithDebt && debtTotal <= 0) return;

    const repaymentPlan = findDebtRepaymentPlanByPlotPeriod(plot.id, selectedPeriod.id);
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
      line: [plot.plotNumber ?? "", plot.street ?? "", plot.ownerFullName ?? "", debtMembership.toFixed(2), debtTarget.toFixed(2), debtElectric.toFixed(2), debtTotal.toFixed(2), statusLabel, comment].join(","),
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
