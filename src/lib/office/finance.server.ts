import { listFinance } from "@/lib/finance.store";
import type { DebtRow } from "./types";

type ListDebtRowsParams = {
  q?: string;
  period?: string;
};

const formatPeriod = (dateIso: string): string => {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${month}`;
};

export async function listDebtRows(params: ListDebtRowsParams = {}): Promise<DebtRow[]> {
  const base = listFinance({ q: params.q });
  const rows: DebtRow[] = base.map((row) => {
    const period = formatPeriod(row.updatedAt);
    const debt = row.balance < 0 ? Math.abs(row.balance) : 0;
    return {
      plotNumber: row.plotNumber,
      ownerName: row.ownerName,
      period,
      accrued: row.accrued,
      paid: row.paid,
      debt,
    };
  });

  if (params.period && params.period !== "all") {
    return rows.filter((row) => row.period === params.period);
  }

  return rows;
}
