"use client";

import { useEffect, useMemo, useState } from "react";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";

type UnallocatedPaymentRow = {
  id: string;
  date: string;
  amount: number;
  payer: string;
  plot: string;
  allocatedAmount?: number;
  remainingAmount?: number;
  allocationStatus?: string;
};

type AllocationRow = {
  id: string;
  paymentId: string;
  accrualId: string;
  amount: number;
  period: string;
  paymentDate: string;
  plot: string;
};

type Filters = {
  q: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default function ReconcileClient() {
  const [filters, setFilters] = useState<Filters>({ q: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<UnallocatedPaymentRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [pendingAction, setPendingAction] = useState<"auto" | "manual" | "unapply" | null>(null);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const totalPages = Math.max(1, Math.ceil(total / 10));

  const loadData = async (nextPage = page, nextPeriod = period) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.q.trim()) params.set("q", filters.q.trim());
      params.set("period", nextPeriod);
      params.set("page", String(nextPage));
      params.set("limit", "10");
      const data = await apiGet<{ items: UnallocatedPaymentRow[]; total: number; page: number }>(
        `/api/office/billing/allocate/unallocated?${params.toString()}`,
      );
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? nextPage);
      setSelected({});

      const allocationsData = await apiGet<{ items: AllocationRow[] }>(
        `/api/office/billing/allocations?period=${nextPeriod}`,
      );
      setAllocations(allocationsData.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки платежей");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(1, period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const handleManual = async (paymentId: string) => {
    const accrualId = window.prompt("Введите ID начисления", "a1");
    if (!accrualId) return;
    const amountRaw = window.prompt("Введите сумму распределения", "1000");
    const amount = amountRaw ? Number(amountRaw) : NaN;
    if (!Number.isFinite(amount)) return;

    setLoading(true);
    setError(null);
    setPendingAction("manual");
    try {
      await apiPost("/api/office/billing/allocate/manual", {
        paymentId,
        accrualId,
        amount,
        reason: showReason && reason.trim() ? reason.trim() : undefined,
      });
      await loadData(page, period);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "period_closed" || err.status === 409)) {
        setShowReason(true);
      }
      setError(err instanceof Error ? err.message : "Ошибка ручного распределения");
    } finally {
      setLoading(false);
    }
  };

  const handleAuto = async (ids?: string[]) => {
    setLoading(true);
    setError(null);
    setPendingAction("auto");
    try {
      await apiPost("/api/office/billing/allocate/auto", {
        paymentIds: ids,
        period,
        reason: showReason && reason.trim() ? reason.trim() : undefined,
      });
      await loadData(page, period);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "period_closed" || err.status === 409)) {
        setShowReason(true);
      }
      setError(err instanceof Error ? err.message : "Ошибка автораспределения");
    } finally {
      setLoading(false);
    }
  };

  const handleUnapply = async (allocationId: string) => {
    setLoading(true);
    setError(null);
    setPendingAction("unapply");
    try {
      await apiPost("/api/office/billing/allocate/unapply", {
        allocationId,
        reason: showReason && reason.trim() ? reason.trim() : undefined,
      });
      await loadData(page, period);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "period_closed" || err.status === 409)) {
        setShowReason(true);
      }
      setError(err instanceof Error ? err.message : "Ошибка снятия распределения");
    } finally {
      setLoading(false);
    }
  };

  const retryWithReason = () => {
    if (pendingAction === "auto") {
      void handleAuto(selectedIds);
    }
  };

  return (
    <div className="space-y-4" data-testid="office-billing-reconcile-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Сверка платежей</h1>
        <p className="text-sm text-zinc-600">Не распределённые оплаты и распределения по начислениям.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold text-zinc-700">
            Период
            <input
              type="month"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold text-zinc-700">
            Поиск
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={filters.q}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              placeholder="ФИО или участок"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void loadData(1, period)}
          >
            Применить фильтры
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold"
            onClick={() => void handleAuto(selectedIds)}
          >
            Автораспределить
          </button>
        </div>
        {showReason && (
          <div className="mt-3">
            <label className="block text-sm font-semibold text-zinc-700">
              Причина изменения (если период закрыт)
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                data-testid="office-reason-input"
              />
            </label>
            <button
              type="button"
              onClick={retryWithReason}
              className="mt-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700"
              data-testid="office-reason-submit-retry"
            >
              Повторить с причиной
            </button>
          </div>
        )}
      </div>

      {loading ? <OfficeLoadingState message="Загрузка платежей..." /> : null}
      {error ? <OfficeErrorState message={error} /> : null}

      {!loading && !error && items.length === 0 ? <OfficeEmptyState /> : null}

      {items.length > 0 && !loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">Выбрано: {selectedIds.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">Выбор</th>
                  <th className="px-3 py-2 text-left">Дата</th>
                  <th className="px-3 py-2 text-left">Сумма</th>
                  <th className="px-3 py-2 text-left">Плательщик</th>
                  <th className="px-3 py-2 text-left">Участок</th>
                  <th className="px-3 py-2 text-right">Остаток</th>
                  <th className="px-3 py-2 text-left">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {items.map((item) => (
                  <tr key={item.id} data-testid={`office-billing-reconcile-row-${item.id}`}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[item.id])}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                      />
                    </td>
                    <td className="px-3 py-2 text-zinc-700">{new Date(item.date).toLocaleDateString("ru-RU")}</td>
                    <td className="px-3 py-2 text-zinc-900 font-semibold">{formatCurrency(item.amount)}</td>
                    <td className="px-3 py-2 text-zinc-700">{item.payer}</td>
                    <td className="px-3 py-2 text-zinc-700">{item.plot}</td>
                    <td className="px-3 py-2 text-right text-zinc-700">
                      {formatCurrency(item.remainingAmount ?? item.amount)}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      <button
                        type="button"
                        className="rounded border border-zinc-200 px-2 py-1 text-xs"
                        onClick={() => void handleManual(item.id)}
                      >
                        Ручное распределение
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-zinc-600">
          <span>
            Стр. {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-zinc-200 px-3 py-1 text-xs font-semibold"
              onClick={() => void loadData(Math.max(1, page - 1), period)}
              disabled={page <= 1}
            >
              Назад
            </button>
            <button
              type="button"
              className="rounded border border-zinc-200 px-3 py-1 text-xs font-semibold"
              onClick={() => void loadData(Math.min(totalPages, page + 1), period)}
              disabled={page >= totalPages}
            >
              Вперёд
            </button>
          </div>
        </div>
      ) : null}

      {allocations.length > 0 && !loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-zinc-900">Последние распределения</div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">Период</th>
                  <th className="px-3 py-2 text-left">Участок</th>
                  <th className="px-3 py-2 text-left">Платёж</th>
                  <th className="px-3 py-2 text-right">Сумма</th>
                  <th className="px-3 py-2 text-left">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {allocations.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 text-zinc-700">{row.period}</td>
                    <td className="px-3 py-2 text-zinc-700">{row.plot}</td>
                    <td className="px-3 py-2 text-zinc-500">{row.paymentDate}</td>
                    <td className="px-3 py-2 text-right text-zinc-900">{formatCurrency(row.amount)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="rounded border border-zinc-200 px-2 py-1 text-xs"
                        onClick={() => void handleUnapply(row.id)}
                      >
                        Отменить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
