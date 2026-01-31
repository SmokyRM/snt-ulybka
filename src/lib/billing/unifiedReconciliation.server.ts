import "server-only";

import type { PeriodAccrual, Payment, UnifiedBillingPeriod } from "@/types/snt";
import {
  ensurePeriodAccrual,
  listPayments,
  listPeriodAccruals,
  listPlots,
  updatePeriodAccrual,
} from "@/lib/mockDb";

export type BillingAccrualType = "membership" | "target" | "electric";

export type PeriodReconciliationRow = {
  plotId: string;
  plotNumber: string;
  street: string;
  ownerName: string;
  accrued: number;
  paid: number;
  debt: number;
  byType: Record<BillingAccrualType, { accrued: number; paid: number; debt: number }>;
};

export type PeriodReconciliation = {
  period: UnifiedBillingPeriod;
  rows: PeriodReconciliationRow[];
  totals: { accrued: number; paid: number; debt: number };
  totalsByType: Record<BillingAccrualType, { accrued: number; paid: number; debt: number }>;
};

const ALL_TYPES: BillingAccrualType[] = ["membership", "target", "electric"];

const emptyTypeTotals = () => ({
  membership: { accrued: 0, paid: 0, debt: 0 },
  target: { accrued: 0, paid: 0, debt: 0 },
  electric: { accrued: 0, paid: 0, debt: 0 },
});

const normalizePaymentType = (category?: string | null): BillingAccrualType | null => {
  if (!category) return null;
  if (category === "membership" || category === "membership_fee") return "membership";
  if (category === "target" || category === "target_fee") return "target";
  if (category === "electricity" || category === "electric") return "electric";
  return null;
};

const toDateOnly = (value: string) => {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value;
};

export const isDateInPeriod = (dateIso: string, period: UnifiedBillingPeriod) => {
  const date = toDateOnly(dateIso);
  if (!date) return false;
  return date >= period.from && date <= period.to;
};

export const findPeriodForDate = (dateIso: string, periods: UnifiedBillingPeriod[]) => {
  const date = toDateOnly(dateIso);
  if (!date) return null;
  return periods.find((period) => date >= period.from && date <= period.to) ?? null;
};

export const listPaymentsForPeriod = (period: UnifiedBillingPeriod, payments?: Payment[]) => {
  const source = payments ?? listPayments({ includeVoided: false });
  return source.filter((payment) => {
    if (!payment.plotId) return false;
    if (payment.periodId && payment.periodId === period.id) return true;
    if (!payment.periodId) {
      return isDateInPeriod(payment.paidAt, period);
    }
    return false;
  });
};

export const buildPeriodReconciliation = (
  period: UnifiedBillingPeriod,
  options?: { updateAccrualPaid?: boolean; includeZero?: boolean }
): PeriodReconciliation => {
  const accruals = listPeriodAccruals(period.id);
  const plots = listPlots();
  const plotMap = new Map(plots.map((plot) => [plot.id, plot]));

  const payments = listPaymentsForPeriod(period);

  const paidByPlotType = new Map<string, Record<BillingAccrualType, number>>();
  payments.forEach((payment) => {
    const type = normalizePaymentType(payment.category);
    if (!type || !payment.plotId) return;
    if (!paidByPlotType.has(payment.plotId)) {
      paidByPlotType.set(payment.plotId, { membership: 0, target: 0, electric: 0 });
    }
    const entry = paidByPlotType.get(payment.plotId)!;
    entry[type] += payment.amount;
  });

  const accrualByPlotType = new Map<string, Record<BillingAccrualType, PeriodAccrual | null>>();
  accruals.forEach((accrual) => {
    if (!accrualByPlotType.has(accrual.plotId)) {
      accrualByPlotType.set(accrual.plotId, { membership: null, target: null, electric: null });
    }
    accrualByPlotType.get(accrual.plotId)![accrual.type] = accrual;
  });

  const plotIds = new Set<string>();
  accruals.forEach((a) => plotIds.add(a.plotId));
  paidByPlotType.forEach((_v, plotId) => plotIds.add(plotId));

  const rows: PeriodReconciliationRow[] = [];

  plotIds.forEach((plotId) => {
    const plot = plotMap.get(plotId);
    const byType = emptyTypeTotals();

    ALL_TYPES.forEach((type) => {
      const accrual = accrualByPlotType.get(plotId)?.[type] ?? null;
      const paidSum = paidByPlotType.get(plotId)?.[type] ?? 0;
      const paid = Math.max(accrual?.amountPaid ?? 0, paidSum);
      const accrued = accrual?.amountAccrued ?? 0;

      if (options?.updateAccrualPaid) {
        const targetAccrual = accrual ?? ensurePeriodAccrual(period.id, plotId, type);
        const updatedPaid = paid;
        if (targetAccrual.amountPaid !== updatedPaid) {
          updatePeriodAccrual(targetAccrual.id, { amountPaid: updatedPaid });
        }
      }

      byType[type] = {
        accrued,
        paid,
        debt: accrued - paid,
      };
    });

    const accrued = ALL_TYPES.reduce((sum, t) => sum + byType[t].accrued, 0);
    const paid = ALL_TYPES.reduce((sum, t) => sum + byType[t].paid, 0);
    const debt = accrued - paid;

    if (!options?.includeZero && accrued === 0 && paid === 0) return;

    rows.push({
      plotId,
      plotNumber: plot?.plotNumber ?? plotId,
      street: plot?.street ?? "",
      ownerName: plot?.ownerFullName ?? "—",
      accrued,
      paid,
      debt,
      byType,
    });
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.accrued += row.accrued;
      acc.paid += row.paid;
      acc.debt += row.debt;
      return acc;
    },
    { accrued: 0, paid: 0, debt: 0 }
  );

  const totalsByType = rows.reduce(
    (acc, row) => {
      ALL_TYPES.forEach((type) => {
        acc[type].accrued += row.byType[type].accrued;
        acc[type].paid += row.byType[type].paid;
        acc[type].debt += row.byType[type].debt;
      });
      return acc;
    },
    emptyTypeTotals()
  );

  return { period, rows, totals, totalsByType };
};
