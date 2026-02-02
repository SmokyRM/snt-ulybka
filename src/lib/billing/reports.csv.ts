export type PaymentsCsvRow = {
  date: string;
  amount: number;
  payer?: string | null;
  plot?: string | null;
  status?: string | null;
  allocated?: number | null;
  remaining?: number | null;
};

export type AccrualsCsvRow = {
  date: string;
  plot?: string | null;
  title: string;
  amount: number;
  paid?: number | null;
  remaining?: number | null;
  status?: string | null;
};

export type DebtorsCsvRow = {
  plot: string;
  resident: string;
  charged: number;
  paid: number;
  debt: number;
};

export type UnallocatedPaymentsCsvRow = {
  date: string;
  amount: number;
  payer?: string | null;
  plot?: string | null;
  status?: string | null;
  remaining?: number | null;
};

const escapeCsv = (value: string | number) => {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\n") || raw.includes("\"")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

export function buildPaymentsCsv(rows: PaymentsCsvRow[]) {
  const header = ["date", "amount", "payer", "plot", "status", "allocated", "remaining"].join(",");
  const body = rows
    .map((row) =>
      [
        escapeCsv(row.date),
        escapeCsv(row.amount),
        escapeCsv(row.payer ?? ""),
        escapeCsv(row.plot ?? ""),
        escapeCsv(row.status ?? "unallocated"),
        escapeCsv(row.allocated ?? 0),
        escapeCsv(row.remaining ?? 0),
      ].join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function buildAccrualsCsv(rows: AccrualsCsvRow[]) {
  const header = ["date", "plot", "title", "amount", "paid", "remaining", "status"].join(",");
  const body = rows
    .map((row) =>
      [
        escapeCsv(row.date),
        escapeCsv(row.plot ?? ""),
        escapeCsv(row.title),
        escapeCsv(row.amount),
        escapeCsv(row.paid ?? 0),
        escapeCsv(row.remaining ?? 0),
        escapeCsv(row.status ?? "open"),
      ].join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function buildDebtorsCsv(rows: DebtorsCsvRow[]) {
  const header = ["plot", "resident", "charged", "paid", "debt"].join(",");
  const body = rows
    .map((row) => [
      escapeCsv(row.plot),
      escapeCsv(row.resident),
      escapeCsv(row.charged),
      escapeCsv(row.paid),
      escapeCsv(row.debt),
    ].join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export function buildUnallocatedPaymentsCsv(rows: UnallocatedPaymentsCsvRow[]) {
  const header = ["date", "amount", "payer", "plot", "status", "remaining"].join(",");
  const body = rows
    .map((row) =>
      [
        escapeCsv(row.date),
        escapeCsv(row.amount),
        escapeCsv(row.payer ?? ""),
        escapeCsv(row.plot ?? ""),
        escapeCsv(row.status ?? "unmatched"),
        escapeCsv(row.remaining ?? 0),
      ].join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}
