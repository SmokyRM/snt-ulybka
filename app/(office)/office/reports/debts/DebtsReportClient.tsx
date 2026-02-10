"use client";

import { useEffect, useState } from "react";
import { apiGet, ApiError } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";
import AppLink from "@/components/AppLink";

type DebtRow = {
  plotId: string;
  plotLabel: string;
  debt: number;
  accrued: number;
  paid: number;
};

type DebtResponse = {
  items: DebtRow[];
  limit: number;
  offset: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default function DebtsReportClient() {
  const [period, setPeriod] = useState("");
  const [minDebt, setMinDebt] = useState("");
  const [street, setStreet] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DebtRow[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (period) params.set("period", period);
      if (street) params.set("street", street);
      if (minDebt) params.set("minDebt", minDebt);
      const data = await apiGet<DebtResponse>(`/api/office/reports/debts?${params.toString()}`);
      setItems(data.items);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось загрузить отчёт";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <OfficeLoadingState message="Загрузка отчёта..." testId="office-debts-report-loading" />;
  }

  if (error) {
    return <OfficeErrorState message={error} onRetry={load} testId="office-debts-report-error" />;
  }

  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (street) params.set("street", street);
  if (minDebt) params.set("minDebt", minDebt);
  const csvUrl = `/api/office/reports/debts.csv?${params.toString()}`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Период (YYYY-MM)"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Минимальный долг"
            value={minDebt}
            onChange={(e) => setMinDebt(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Линия"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#536443]"
          >
            Применить
          </button>
          <AppLink
            href={csvUrl}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
          >
            Экспорт CSV
          </AppLink>
        </div>
      </div>

      {items.length === 0 ? (
        <OfficeEmptyState message="Нет данных по задолженности." testId="office-debts-report-empty" />
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Топ должников</div>
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            {items.map((row) => (
              <div key={row.plotId} className="flex flex-wrap items-center justify-between gap-2">
                <div>{row.plotLabel}</div>
                <div className="text-right font-semibold text-zinc-900">{formatCurrency(row.debt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
