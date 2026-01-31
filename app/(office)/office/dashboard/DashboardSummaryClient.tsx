"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import OfficeLoadingState from "../_components/OfficeLoadingState";
import OfficeErrorState from "../_components/OfficeErrorState";

type DashboardSummary = {
  period: string;
  billing: {
    accrued: number;
    paid: number;
    debtEnd: number;
    paymentsCount: number;
  };
  appeals: {
    new: number;
    inProgress: number;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default function DashboardSummaryClient({ period }: { period: string }) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period });
      const summary = await apiGet<DashboardSummary>(`/api/office/dashboard/summary?${params.toString()}`);
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки дашборда");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [period]);

  if (loading) {
    return <OfficeLoadingState message="Загружаем показатели..." testId="office-dashboard-loading" />;
  }

  if (error || !data) {
    return <OfficeErrorState message={error || "Ошибка загрузки"} onRetry={loadSummary} testId="office-dashboard-error" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="office-dashboard-root">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Долг на конец месяца</div>
        <div className="mt-2 text-2xl font-semibold text-zinc-900" data-testid="office-dashboard-kpi-debt">
          {formatCurrency(data.billing.debtEnd)}
        </div>
        <div className="mt-2 text-sm text-zinc-600">
          Начислено: {formatCurrency(data.billing.accrued)} · Оплачено: {formatCurrency(data.billing.paid)}
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Обращения</div>
        <div className="mt-2 text-2xl font-semibold text-zinc-900">
          {data.appeals.new}
          <span className="ml-2 text-sm font-normal text-zinc-500">новых</span>
        </div>
        <div className="mt-2 text-sm text-zinc-600">В работе: {data.appeals.inProgress}</div>
        <div className="mt-2 text-xs text-zinc-500">Платежей за период: {data.billing.paymentsCount}</div>
      </div>
    </div>
  );
}
