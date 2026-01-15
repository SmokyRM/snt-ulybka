"use client";

import { useMemo } from "react";

import type { DebtRow } from "@/lib/office/types";

type Props = {
  rows: DebtRow[];
  disabled?: boolean;
};

const toCsv = (rows: DebtRow[]): string => {
  const header = ["Участок", "Владелец", "Период", "Начислено", "Оплачено", "Долг"];
  const lines = rows.map((row) =>
    [
      `"${row.plotNumber.replace(/"/g, '""')}"`,
      `"${(row.ownerName ?? "").replace(/"/g, '""')}"`,
      row.period,
      row.accrued,
      row.paid,
      row.debt,
    ].join(","),
  );
  return [header.join(","), ...lines].join("\n");
};

export default function ExportButton({ rows, disabled }: Props) {
  const csv = useMemo(() => toCsv(rows), [rows]);

  const handleExport = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || rows.length === 0}
      className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-[#5E704F] transition hover:border-[#5E704F] hover:text-[#5E704F] disabled:opacity-60"
      data-testid="office-finance-export"
    >
      Экспорт CSV
    </button>
  );
}
