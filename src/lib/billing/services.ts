/**
 * Billing services
 */

import {
  getPeriod,
  listAccruals,
  listPaymentAllocations,
  listPayments,
  updateAccrual,
  createPaymentAllocation,
  getAccrual,
  getPayment,
} from "./store";
import type {
  PeriodSummary,
  PlotBalance,
  PlotBalanceBreakdown,
  DebtByPlotResult,
  ComputeDebtByPlotFilters,
  AccrualStatus,
  PaymentAllocation,
} from "./types";

/**
 * Get period summary: totals accrued/paid/debt
 */
export function getPeriodSummary(periodId: string): PeriodSummary | null {
  const period = getPeriod(periodId);
  if (!period) return null;

  const accruals = listAccruals({ periodId });
  const allocations = listPaymentAllocations({});

  // Calculate total accrued
  const totalAccrued = accruals.reduce((sum, a) => sum + a.amount, 0);

  // Calculate total paid for this period's accruals
  const accrualIds = new Set(accruals.map((a) => a.id));
  const relevantAllocations = allocations.filter((a) => accrualIds.has(a.accrualId));
  const totalPaid = relevantAllocations.reduce((sum, a) => sum + a.amount, 0);

  const totalDebt = totalAccrued - totalPaid;

  return {
    periodId,
    totalAccrued,
    totalPaid,
    totalDebt,
  };
}

/**
 * Get plot balance: totals accrued/paid/debt + breakdown
 * If periodId is provided, filters to that period only
 */
export function getPlotBalance(plotId: string, periodId?: string | null): PlotBalance {
  // Get accruals for this plot (optionally filtered by period)
  const accruals = listAccruals({ plotId, periodId: periodId ?? null });

  // Get all allocations for these accruals
  const accrualIds = accruals.map((a) => a.id);
  const allAllocations = listPaymentAllocations({});
  const relevantAllocations = allAllocations.filter((a) => accrualIds.includes(a.accrualId));

  // Calculate totals
  const totalAccrued = accruals.reduce((sum, a) => sum + a.amount, 0);
  const totalPaid = relevantAllocations.reduce((sum, a) => sum + a.amount, 0);
  const totalDebt = totalAccrued - totalPaid;

  // Build breakdown
  const breakdown: PlotBalanceBreakdown[] = accruals.map((accrual) => {
    const allocated = relevantAllocations
      .filter((a) => a.accrualId === accrual.id)
      .reduce((sum, a) => sum + a.amount, 0);
    const remaining = accrual.amount - allocated;

    // Determine status
    let status: AccrualStatus = "pending";
    if (remaining <= 0) {
      status = "paid";
    } else if (allocated > 0) {
      status = "partial";
    }

    return {
      accrualId: accrual.id,
      periodId: accrual.periodId,
      tariffId: accrual.tariffId,
      amount: accrual.amount,
      allocated,
      remaining,
      status,
    };
  });

  return {
    plotId,
    periodId: periodId ?? null,
    totalAccrued,
    totalPaid,
    totalDebt,
    breakdown,
  };
}

/**
 * Allocate payment to oldest unpaid accruals (FIFO)
 * Returns array of created allocations
 */
export function allocatePayment(paymentId: string): PaymentAllocation[] {
  const payment = getPayment(paymentId);
  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  if (!payment.plotId) {
    throw new Error(`Payment ${paymentId} has no plotId, cannot allocate`);
  }

  // Get existing allocations for this payment
  const existingAllocations = listPaymentAllocations({ paymentId });
  const alreadyAllocated = existingAllocations.reduce((sum, a) => sum + a.amount, 0);
  const remainingToAllocate = payment.amount - alreadyAllocated;

  if (remainingToAllocate <= 0) {
    // Payment already fully allocated
    return existingAllocations;
  }

  // Get unpaid accruals for this plot, sorted by creation date (oldest first - FIFO)
  const plotAccruals = listAccruals({ plotId: payment.plotId });
  const allAllocations = listPaymentAllocations({});
  const allocationsByAccrualId = new Map<string, number>();
  allAllocations.forEach((a) => {
    allocationsByAccrualId.set(a.accrualId, (allocationsByAccrualId.get(a.accrualId) ?? 0) + a.amount);
  });

  // Find unpaid accruals, sorted by creation date (oldest first)
  const unpaidAccruals = plotAccruals
    .map((accrual) => {
      const allocated = allocationsByAccrualId.get(accrual.id) ?? 0;
      const remaining = accrual.amount - allocated;
      return { accrual, remaining };
    })
    .filter((item) => item.remaining > 0)
    .sort((a, b) => new Date(a.accrual.createdAt).getTime() - new Date(b.accrual.createdAt).getTime());

  // Allocate FIFO
  const createdAllocations: PaymentAllocation[] = [];
  let remaining = remainingToAllocate;

  for (const { accrual, remaining: accrualRemaining } of unpaidAccruals) {
    if (remaining <= 0) break;

    const allocateAmount = Math.min(remaining, accrualRemaining);
    const allocation = createPaymentAllocation({
      paymentId,
      accrualId: accrual.id,
      amount: allocateAmount,
    });
    createdAllocations.push(allocation);

    // Update accrual status
    const newAllocated = (allocationsByAccrualId.get(accrual.id) ?? 0) + allocateAmount;
    let status: AccrualStatus = "pending";
    if (newAllocated >= accrual.amount) {
      status = "paid";
    } else if (newAllocated > 0) {
      status = "partial";
    }
    updateAccrual(accrual.id, { status });

    remaining -= allocateAmount;
  }

  return [...existingAllocations, ...createdAllocations];
}

/**
 * Compute debt by plot with filters
 */
export function computeDebtByPlot(filters: ComputeDebtByPlotFilters = {}): DebtByPlotResult[] {
  const { periodId, plotId, minDebt } = filters;

  // Get accruals based on filters
  const accruals = listAccruals({
    periodId: periodId ?? null,
    plotId: plotId ?? null,
  });

  // Get all relevant allocations
  const accrualIds = accruals.map((a) => a.id);
  const allAllocations = listPaymentAllocations({});
  const relevantAllocations = allAllocations.filter((a) => accrualIds.includes(a.accrualId));

  // Group by accrual ID for quick lookup
  const allocationsByAccrualId = new Map<string, number>();
  relevantAllocations.forEach((a) => {
    allocationsByAccrualId.set(a.accrualId, (allocationsByAccrualId.get(a.accrualId) ?? 0) + a.amount);
  });

  // Get periods for lookup
  const periodIds = new Set(accruals.map((a) => a.periodId));
  const periodsMap = new Map<string, { year: number; month: number }>();
  periodIds.forEach((pid) => {
    const period = getPeriod(pid);
    if (period) {
      periodsMap.set(pid, { year: period.year, month: period.month });
    }
  });

  // Calculate debt by plot and period
  const debtByPlot = new Map<string, { totalDebt: number; periods: Map<string, number> }>();

  accruals.forEach((accrual) => {
    const allocated = allocationsByAccrualId.get(accrual.id) ?? 0;
    const debt = accrual.amount - allocated;

    if (debt <= 0) return; // Skip fully paid

    if (!debtByPlot.has(accrual.plotId)) {
      debtByPlot.set(accrual.plotId, {
        totalDebt: 0,
        periods: new Map<string, number>(),
      });
    }

    const plotData = debtByPlot.get(accrual.plotId)!;
    plotData.totalDebt += debt;

    const periodDebt = plotData.periods.get(accrual.periodId) ?? 0;
    plotData.periods.set(accrual.periodId, periodDebt + debt);
  });

  // Convert to result format
  const results: DebtByPlotResult[] = Array.from(debtByPlot.entries())
    .map(([plotId, data]) => {
      const periods = Array.from(data.periods.entries())
        .map(([periodId, debt]) => {
          const periodInfo = periodsMap.get(periodId);
          if (!periodInfo) return null;
          return {
            periodId,
            year: periodInfo.year,
            month: periodInfo.month,
            debt,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });

      return {
        plotId,
        totalDebt: data.totalDebt,
        periods,
      };
    })
    .filter((result) => {
      // Apply minDebt filter if provided
      if (minDebt !== null && minDebt !== undefined) {
        return result.totalDebt >= minDebt;
      }
      return true;
    })
    .sort((a, b) => b.totalDebt - a.totalDebt); // Sort by debt descending

  return results;
}

// Re-export types for convenience (already exported from types)