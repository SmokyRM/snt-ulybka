/**
 * Billing Core - Services
 */

import { listAccruals } from "./accruals.store";
import { listPayments, listPaymentAllocations } from "./payments.store";

/**
 * Calculate debt for a plot (simple: accruals - payments allocations)
 */
export function computePlotDebt(plotId: string, periodId?: string | null): {
  totalAccrued: number;
  totalPaid: number;
  totalDebt: number;
} {
  const accruals = listAccruals({ plotId, periodId: periodId || null });
  const allocations = listPaymentAllocations();

  const accrualIds = new Set(accruals.map((a) => a.id));
  const relevantAllocations = allocations.filter((a) => accrualIds.has(a.accrualId));

  const totalAccrued = accruals.reduce((sum, a) => sum + a.amount, 0);
  const totalPaid = relevantAllocations.reduce((sum, a) => sum + a.amount, 0);
  const totalDebt = totalAccrued - totalPaid;

  return { totalAccrued, totalPaid, totalDebt };
}

/**
 * Calculate debts for all plots (simple allocation)
 */
export function computeDebtsByPlot(filters?: {
  periodId?: string | null;
  minDebt?: number | null;
}): Array<{
  plotId: string;
  totalDebt: number;
  totalAccrued: number;
  totalPaid: number;
}> {
  const accruals = listAccruals({ periodId: filters?.periodId || null });
  const allocations = listPaymentAllocations();

  const accrualIds = new Set(accruals.map((a) => a.id));
  const relevantAllocations = allocations.filter((a) => accrualIds.has(a.accrualId));

  // Group by plotId
  const plotData = new Map<string, { accrued: number; paid: number }>();

  accruals.forEach((accrual) => {
    if (!plotData.has(accrual.plotId)) {
      plotData.set(accrual.plotId, { accrued: 0, paid: 0 });
    }
    const data = plotData.get(accrual.plotId)!;
    data.accrued += accrual.amount;
  });

  relevantAllocations.forEach((allocation) => {
    const accrual = accruals.find((a) => a.id === allocation.accrualId);
    if (accrual && plotData.has(accrual.plotId)) {
      const data = plotData.get(accrual.plotId)!;
      data.paid += allocation.amount;
    }
  });

  const results = Array.from(plotData.entries())
    .map(([plotId, data]) => ({
      plotId,
      totalDebt: Math.max(0, data.accrued - data.paid),
      totalAccrued: data.accrued,
      totalPaid: data.paid,
    }))
    .filter((result) => {
      if (filters?.minDebt !== null && filters?.minDebt !== undefined) {
        return result.totalDebt >= filters.minDebt;
      }
      return true;
    })
    .sort((a, b) => b.totalDebt - a.totalDebt);

  return results;
}