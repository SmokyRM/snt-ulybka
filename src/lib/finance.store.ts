import "server-only";

import { listUnifiedBillingPeriods, listPlots } from "@/lib/mockDb";
import { buildPeriodReconciliation } from "@/lib/billing/unifiedReconciliation.server";

export type FinanceRow = {
  plotNumber: string;
  ownerName?: string;
  accrued: number;
  paid: number;
  balance: number;
  updatedAt: string;
};

type ListParams = {
  q?: string;
  debtorsOnly?: boolean;
};

export function listFinance(params: ListParams = {}): FinanceRow[] {
  const query = params.q?.trim().toLowerCase();
  const periods = listUnifiedBillingPeriods();
  if (periods.length === 0) return [];

  const plotMap = new Map(listPlots().map((plot) => [plot.id, plot]));
  const rows: FinanceRow[] = [];

  periods.forEach((period) => {
    const reconciliation = buildPeriodReconciliation(period);
    reconciliation.rows.forEach((row) => {
      const plot = plotMap.get(row.plotId);
      const plotLabel =
        plot?.street && plot?.plotNumber ? `${plot.street}, ${plot.plotNumber}` : row.plotNumber;
      rows.push({
        plotNumber: plotLabel,
        ownerName: row.ownerName || undefined,
        accrued: row.accrued,
        paid: row.paid,
        balance: row.paid - row.accrued,
        updatedAt: `${period.to}T00:00:00.000Z`,
      });
    });
  });

  return rows
    .filter((row) => {
      if (params.debtorsOnly && row.balance >= 0) return false;
      if (query) {
        const haystack = `${row.plotNumber} ${row.ownerName ?? ""}`.toLowerCase();
        return haystack.includes(query);
      }
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
