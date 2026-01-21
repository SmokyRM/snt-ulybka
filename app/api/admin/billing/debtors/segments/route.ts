import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { ok, unauthorized, forbidden } from "@/lib/api/respond";
import {
  listUnifiedBillingPeriods,
  listPeriodAccruals,
  listPlots,
  listPayments,
} from "@/lib/mockDb";
import type { PeriodAccrual } from "@/types/snt";

type DebtorItem = {
  plotId: string;
  plotNumber: string;
  street: string;
  ownerFullName: string | null;
  debtMembership: number;
  debtTarget: number;
  debtElectric: number;
  debtTotal: number;
  daysOverdue: number; // количество дней просрочки (от даты окончания периода)
  periodId: string;
  periodFrom: string;
  periodTo: string;
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    return forbidden(request);
  }

  const { searchParams } = new URL(request.url);
  const periodId = searchParams.get("periodId") || null;
  const daysOverdue = searchParams.get("daysOverdue"); // "30", "60", "90", "90+"
  const minAmount = searchParams.get("minAmount") ? Number(searchParams.get("minAmount")) : null;
  const debtType = searchParams.get("debtType") as "membership" | "target" | "electric" | "all" | null; // "membership", "target", "electric", "all"

  // Get periods
  const periods = periodId
    ? listUnifiedBillingPeriods().filter((p) => p.id === periodId)
    : listUnifiedBillingPeriods().filter((p) => p.status === "approved" || p.status === "closed");

  if (periods.length === 0) {
    return ok(request, { items: [], totals: { count: 0, sumTotal: 0 } });
  }

  const selectedPeriod = periods.sort((a, b) => b.from.localeCompare(a.from))[0];
  const accruals = listPeriodAccruals(selectedPeriod.id);
  const plots = listPlots();
  const allPayments = listPayments({});

  // Calculate days overdue from period end date
  const periodEndDate = new Date(selectedPeriod.to);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const baseDaysOverdue = Math.max(0, Math.floor((today.getTime() - periodEndDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Group accruals by plot and type
  const accrualsByPlot: Record<
    string,
    {
      membership: PeriodAccrual[];
      target: PeriodAccrual[];
      electric: PeriodAccrual[];
    }
  > = {};

  accruals.forEach((acc) => {
    if (!accrualsByPlot[acc.plotId]) {
      accrualsByPlot[acc.plotId] = { membership: [], target: [], electric: [] };
    }
    if (acc.type === "membership") {
      accrualsByPlot[acc.plotId].membership.push(acc);
    } else if (acc.type === "target") {
      accrualsByPlot[acc.plotId].target.push(acc);
    } else if (acc.type === "electric") {
      accrualsByPlot[acc.plotId].electric.push(acc);
    }
  });

  // Calculate payments by plot and type
  const paymentsByPlot: Record<string, { membership: number; target: number; electric: number }> = {};

  accruals.forEach((acc) => {
    if (!paymentsByPlot[acc.plotId]) {
      paymentsByPlot[acc.plotId] = { membership: 0, target: 0, electric: 0 };
    }
    if (acc.type === "membership") {
      paymentsByPlot[acc.plotId].membership += acc.amountPaid;
    } else if (acc.type === "target") {
      paymentsByPlot[acc.plotId].target += acc.amountPaid;
    } else if (acc.type === "electric") {
      paymentsByPlot[acc.plotId].electric += acc.amountPaid;
    }
  });

  allPayments
    .filter((p) => p.periodId === selectedPeriod.id)
    .forEach((payment) => {
      if (!paymentsByPlot[payment.plotId]) {
        paymentsByPlot[payment.plotId] = { membership: 0, target: 0, electric: 0 };
      }
      if (payment.category === "membership" || payment.category === "membership_fee") {
        paymentsByPlot[payment.plotId].membership += payment.amount;
      } else if (payment.category === "target" || payment.category === "target_fee") {
        paymentsByPlot[payment.plotId].target += payment.amount;
      } else if (payment.category === "electricity" || payment.category === "electric") {
        paymentsByPlot[payment.plotId].electric += payment.amount;
      }
    });

  // Calculate debts
  const items: DebtorItem[] = plots
    .map((plot) => {
      const plotAccruals = accrualsByPlot[plot.id] || { membership: [], target: [], electric: [] };
      const plotPayments = paymentsByPlot[plot.id] || { membership: 0, target: 0, electric: 0 };

      const debtMembership = Math.max(
        plotAccruals.membership.reduce((sum, acc) => sum + acc.amountAccrued, 0) - plotPayments.membership,
        0
      );
      const debtTarget = Math.max(
        plotAccruals.target.reduce((sum, acc) => sum + acc.amountAccrued, 0) - plotPayments.target,
        0
      );
      const debtElectric = Math.max(
        plotAccruals.electric.reduce((sum, acc) => sum + acc.amountAccrued, 0) - plotPayments.electric,
        0
      );
      const debtTotal = debtMembership + debtTarget + debtElectric;

      return {
        plotId: plot.id,
        plotNumber: plot.plotNumber,
        street: plot.street,
        ownerFullName: plot.ownerFullName || null,
        debtMembership,
        debtTarget,
        debtElectric,
        debtTotal,
        daysOverdue: baseDaysOverdue,
        periodId: selectedPeriod.id,
        periodFrom: selectedPeriod.from,
        periodTo: selectedPeriod.to,
      };
    })
    .filter((item) => item.debtTotal > 0);

  // Apply filters
  let filtered = items;

  // Filter by days overdue
  if (daysOverdue) {
    if (daysOverdue === "30") {
      filtered = filtered.filter((item) => item.daysOverdue >= 30 && item.daysOverdue < 60);
    } else if (daysOverdue === "60") {
      filtered = filtered.filter((item) => item.daysOverdue >= 60 && item.daysOverdue < 90);
    } else if (daysOverdue === "90+") {
      filtered = filtered.filter((item) => item.daysOverdue >= 90);
    }
  }

  // Filter by minimum amount
  if (minAmount !== null && minAmount > 0) {
    filtered = filtered.filter((item) => item.debtTotal >= minAmount);
  }

  // Filter by debt type
  if (debtType && debtType !== "all") {
    filtered = filtered.filter((item) => {
      if (debtType === "membership") return item.debtMembership > 0;
      if (debtType === "target") return item.debtTarget > 0;
      if (debtType === "electric") return item.debtElectric > 0;
      return true;
    });
  }

  // Calculate totals
  const totals = filtered.reduce(
    (acc, item) => {
      acc.sumTotal += item.debtTotal;
      return acc;
    },
    { count: filtered.length, sumTotal: 0 }
  );

  return ok(request, {
    items: filtered,
    totals,
    period: {
      id: selectedPeriod.id,
      from: selectedPeriod.from,
      to: selectedPeriod.to,
      title: selectedPeriod.title,
    },
  });
}
