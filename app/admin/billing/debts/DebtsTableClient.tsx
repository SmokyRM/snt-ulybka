"use client";

import { useEffect, useState } from "react";
import type { BillingPeriod } from "@/lib/billing/core";
import { readOk } from "@/lib/api/client";

interface DebtRow {
  plotId: string;
  totalDebt: number;
  periods: Array<{
    periodId: string;
    year: number;
    month: number;
    debt: number;
  }>;
  street: string;
  plotNumber: string;
  ownerName: string;
  phone: string;
  email: string;
}

interface DebtsTableClientProps {
  initialPeriodId: string | null;
  initialMinDebt: string | null;
  periods: BillingPeriod[];
}

export default function DebtsTableClient({ initialPeriodId, initialMinDebt, periods }: DebtsTableClientProps) {
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(initialPeriodId);
  const [minDebt, setMinDebt] = useState<string>(initialMinDebt || "");

  const loadDebts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedPeriodId) params.set("periodId", selectedPeriodId);
      if (minDebt) params.set("minDebt", minDebt);

      const res = await fetch(`/api/admin/billing/debts?${params.toString()}`, { cache: "no-store" });
      const { debts } = await readOk<{ debts: DebtRow[] }>(res);
      setDebts(debts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Use setTimeout to ensure component is mounted before state updates
    const timeoutId = setTimeout(() => {
      loadDebts();
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriodId, minDebt]);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (selectedPeriodId) params.set("periodId", selectedPeriodId);
    if (minDebt) params.set("minDebt", minDebt);
    params.set("format", "csv");
    window.location.href = `/api/admin/billing/debts?${params.toString()}`;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPeriod = (year: number, month: number) => {
    return `${year}-${String(month).padStart(2, "0")}`;
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.totalDebt, 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-700">Период</span>
            <select
              value={selectedPeriodId || ""}
              onChange={(e) => setSelectedPeriodId(e.target.value || null)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Все периоды</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPeriod(p.year, p.month)} ({p.status === "closed" ? "закрыт" : "открыт"})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-700">Мин. долг, ₽</span>
            <input
              type="number"
              step="0.01"
              value={minDebt}
              onChange={(e) => setMinDebt(e.target.value)}
              placeholder="0"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={loadDebts}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Применить
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={debts.length === 0}
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Экспорт CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div>
          <div className="text-xs text-zinc-600">Всего должников</div>
          <div className="text-lg font-semibold text-zinc-900">{debts.length}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-600">Общий долг</div>
          <div className="text-lg font-semibold text-red-700">{formatAmount(totalDebt)}</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">
          Загрузка...
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участок</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Владелец</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Телефон</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">Долг, ₽</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Периоды</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {debts.map((debt) => (
                  <tr key={debt.plotId} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      {debt.street}, {debt.plotNumber}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{debt.ownerName || "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{debt.phone || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-700">
                      {formatAmount(debt.totalDebt)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      <div className="flex flex-wrap gap-1">
                        {debt.periods.slice(0, 3).map((p) => (
                          <span key={p.periodId} className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
                            {formatPeriod(p.year, p.month)}: {formatAmount(p.debt)}
                          </span>
                        ))}
                        {debt.periods.length > 3 && (
                          <span className="text-xs text-zinc-500">+{debt.periods.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {debts.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                      Долгов не найдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}