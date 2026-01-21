"use client";

import { useEffect, useState } from "react";
import { readOk } from "@/lib/api/client";

type ReportItem = {
  plotId: string;
  street: string;
  number: string;
  ownerFullName?: string | null;
  deltaKwh: number;
  amountAccrued: number;
  amountPaid: number;
  debt: number;
};

type ReportResponse = {
  items: ReportItem[];
};

export default function ReportClient() {
  const now = new Date();
  const [year, setYear] = useState<string>(now.getFullYear().toString());
  const [month, setMonth] = useState<string>((now.getMonth() + 1).toString());
  const [plotNumber, setPlotNumber] = useState("");
  const [onlyDebtors, setOnlyDebtors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      params.set("year", year);
      params.set("month", month);
      if (plotNumber) params.set("plotNumber", plotNumber);
      if (onlyDebtors) params.set("onlyDebtors", "true");

      const res = await fetch(`/api/admin/electricity/report?${params.toString()}`, { cache: "no-store" });
      const data = await readOk<ReportResponse>(res);
      setItems(data.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecalc = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/electricity/accrue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year), month: Number(month) }),
      });
      await readOk(res);
      setMessage("Начисление завершено");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const params = new URLSearchParams();
    params.set("year", year);
    params.set("month", month);
    if (plotNumber) params.set("plotNumber", plotNumber);
    if (onlyDebtors) params.set("onlyDebtors", "true");
    window.location.href = `/api/admin/electricity/report/export.csv?${params.toString()}`;
  };

  const exportXlsx = async () => {
    try {
      const { buildXlsxFromArray, downloadXlsx } = await import("@/lib/excel");

      const header = ["Улица", "Участок", "Владелец", "Δ кВт", "Начислено ₽", "Оплачено ₽", "Долг ₽"];
      const rows = items.map((i) => [
        i.street,
        i.number,
        i.ownerFullName || "",
        i.deltaKwh,
        i.amountAccrued,
        i.amountPaid,
        i.debt,
      ]);

      const buffer = await buildXlsxFromArray([header, ...rows], "Отчёт");
      downloadXlsx(buffer, `electricity_report_${year}-${month.padStart(2, "0")}.xlsx`);
    } catch (e) {
      setError(`Ошибка экспорта XLSX: ${(e as Error).message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totals = items.reduce(
    (acc, item) => {
      acc.accrued += item.amountAccrued;
      acc.paid += item.amountPaid;
      acc.debt += item.debt;
      acc.deltaKwh += item.deltaKwh;
      return acc;
    },
    { accrued: 0, paid: 0, debt: 0, deltaKwh: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm print:hidden">
        <label className="text-sm text-zinc-700">
          Год
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="mt-1 w-28 rounded border border-zinc-300 px-2 py-1"
          />
        </label>
        <label className="text-sm text-zinc-700">
          Месяц
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 w-20 rounded border border-zinc-300 px-2 py-1"
          />
        </label>
        <label className="text-sm text-zinc-700">
          Участок
          <input
            type="text"
            value={plotNumber}
            onChange={(e) => setPlotNumber(e.target.value)}
            placeholder="Все"
            className="mt-1 w-32 rounded border border-zinc-300 px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyDebtors}
            onChange={(e) => setOnlyDebtors(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm text-zinc-700">Только должники</span>
        </label>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          Показать
        </button>
        <button
          type="button"
          onClick={handleRecalc}
          disabled={loading}
          className="rounded border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400"
        >
          Пересчитать
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={items.length === 0}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
        >
          Экспорт CSV
        </button>
        <button
          type="button"
          onClick={exportXlsx}
          disabled={items.length === 0}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
        >
          Экспорт XLSX
        </button>
        <button
          type="button"
          onClick={handlePrint}
          disabled={items.length === 0}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
        >
          Печать
        </button>
        {loading && <span className="text-sm text-zinc-600">Обновляем...</span>}
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}

      {/* Table */}
      <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm print:text-xs">
          <thead className="bg-zinc-50 print:bg-white">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Улица</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Владелец</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Δ кВт</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Начислено ₽</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Оплачено ₽</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Долг ₽</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((item) => {
              const debtPositive = item.debt > 0.001;
              return (
                <tr key={item.plotId} className={debtPositive ? "bg-red-50/50" : undefined}>
                  <td className="px-3 py-2">{item.street}</td>
                  <td className="px-3 py-2">{item.number}</td>
                  <td className="px-3 py-2">{item.ownerFullName || "—"}</td>
                  <td className="px-3 py-2">{item.deltaKwh.toFixed(2)}</td>
                  <td className="px-3 py-2">{item.amountAccrued.toFixed(2)}</td>
                  <td className="px-3 py-2">{item.amountPaid.toFixed(2)}</td>
                  <td className={`px-3 py-2 font-semibold ${debtPositive ? "text-red-700" : "text-green-700"}`}>
                    {item.debt.toFixed(2)}
                  </td>
                </tr>
              );
            })}
            {items.length > 0 && (
              <tr className="bg-zinc-50 font-semibold print:bg-zinc-100">
                <td className="px-3 py-2" colSpan={3}>
                  Итого
                </td>
                <td className="px-3 py-2">{totals.deltaKwh.toFixed(2)}</td>
                <td className="px-3 py-2">{totals.accrued.toFixed(2)}</td>
                <td className="px-3 py-2">{totals.paid.toFixed(2)}</td>
                <td className={`px-3 py-2 ${totals.debt > 0.01 ? "text-red-700" : "text-green-700"}`}>
                  {totals.debt.toFixed(2)}
                </td>
              </tr>
            )}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-zinc-600" colSpan={7}>
                  {loading ? "Загрузка..." : "Нет данных"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:bg-zinc-100 {
            background: #f4f4f5 !important;
          }
          .print\\:text-xs {
            font-size: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}
