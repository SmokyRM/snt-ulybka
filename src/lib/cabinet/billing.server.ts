import "server-only";

import { listCharges, listPayments, getPlotLabel } from "@/lib/billing.store";
import { listPlots } from "@/lib/mockDb";

export type ResidentBillingPeriod = {
  period: string;
  accrued: number;
  paid: number;
  debt: number;
  plotId?: string;
  plotLabel?: string;
};

export type ResidentBillingSummary = {
  totalAccrued: number;
  totalPaid: number;
  totalDebt: number;
  penalty: number;
  plotId?: string;
  plotLabel?: string;
  periods: ResidentBillingPeriod[];
};

const toPeriod = (value: string) => value.slice(0, 7);

function resolvePlotIds(userId: string, charges: ReturnType<typeof listCharges>, payments: ReturnType<typeof listPayments>) {
  const plotIds = new Set<string>();
  charges.forEach((c) => plotIds.add(c.plotId));
  payments.forEach((p) => plotIds.add(p.plotId));
  if (plotIds.size === 0) {
    listPlots()
      .filter((plot) => plot.ownerUserId === userId)
      .forEach((plot) => plotIds.add(plot.plotId || plot.id));
  }
  return Array.from(plotIds);
}

export function buildResidentBillingSummary(userId: string): ResidentBillingSummary {
  const charges = listCharges().filter((c) => c.residentId === userId);
  const payments = listPayments().filter((p) => p.residentId === userId);
  const periodMap = new Map<string, { accrued: number; paid: number }>();

  charges.forEach((c) => {
    const period = c.period ?? toPeriod(c.date);
    const current = periodMap.get(period) ?? { accrued: 0, paid: 0 };
    current.accrued += c.amount;
    periodMap.set(period, current);
  });

  payments.forEach((p) => {
    const period = toPeriod(p.date);
    const current = periodMap.get(period) ?? { accrued: 0, paid: 0 };
    current.paid += p.amount;
    periodMap.set(period, current);
  });

  const plotIds = resolvePlotIds(userId, charges, payments);
  const plotId = plotIds[0];
  const plotLabel = plotId ? getPlotLabel(plotId) : undefined;

  const periods: ResidentBillingPeriod[] = Array.from(periodMap.entries())
    .map(([period, values]) => ({
      period,
      accrued: values.accrued,
      paid: values.paid,
      debt: Math.max(0, values.accrued - values.paid),
      plotId,
      plotLabel,
    }))
    .sort((a, b) => (a.period > b.period ? -1 : 1));

  const totalAccrued = periods.reduce((sum, item) => sum + item.accrued, 0);
  const totalPaid = periods.reduce((sum, item) => sum + item.paid, 0);
  const totalDebt = Math.max(0, totalAccrued - totalPaid);

  return {
    totalAccrued,
    totalPaid,
    totalDebt,
    penalty: 0,
    plotId,
    plotLabel,
    periods,
  };
}
