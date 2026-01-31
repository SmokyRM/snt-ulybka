"use client";

import { useEffect, useMemo, useState } from "react";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";
import { apiGet, apiPost } from "@/lib/api/client";

type PaymentRow = {
  id: string;
  date: string;
  amount: number;
  payer: string;
  plot: string;
  status: "unmatched" | "needs_review" | "matched";
  matchReason: string;
  matchedPlotId: string | null;
};

type Filters = {
  status: "all" | "unmatched" | "needs_review" | "matched";
  q: string;
  from: string;
  to: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default function ReconcileClient() {
  const [filters, setFilters] = useState<Filters>({ status: "all", q: "", from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.q.trim()) params.set("q", filters.q.trim());
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const data = await apiGet<{ items: PaymentRow[] }>(`/api/office/billing/payments?${params.toString()}`);
      setItems(data.items ?? []);
      setSelected({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки платежей");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayments();
  }, []);

  const handleBulk = async (action: "confirm" | "review" | "unmatch") => {
    if (!selectedIds.length) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/billing/reconcile/bulk", { ids: selectedIds, action });
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка массового действия");
    } finally {
      setLoading(false);
    }
  };

  const handleSingleAction = async (id: string, action: "confirm" | "review" | "unmatch") => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/billing/reconcile/bulk", { ids: [id], action });
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка действия");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = (id: string) => handleSingleAction(id, "confirm");
  const handleUnmatch = (id: string) => handleSingleAction(id, "unmatch");

  const handleManual = async (id: string) => {
    const plotId = window.prompt("Введите ID/номер участка для сопоставления", "p1");
    if (!plotId) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/billing/reconcile/manual", { paymentId: id, plotId });
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка ручного сопоставления");
    } finally {
      setLoading(false);
    }
  };

  const handleAuto = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/billing/reconcile/auto", {});
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка автосопоставления");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="office-billing-reconcile-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Сверка платежей</h1>
        <p className="text-sm text-zinc-600">Проверка сопоставления оплат и участков.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold text-zinc-700">
            Статус
            <select
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as Filters["status"] }))}
            >
              <option value="all">Все</option>
              <option value="unmatched">Не сопоставлено</option>
              <option value="needs_review">Нужна проверка</option>
              <option value="matched">Сопоставлено</option>
            </select>
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
          <label className="text-sm font-semibold text-zinc-700">
            С даты
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
            />
          </label>
          <label className="text-sm font-semibold text-zinc-700">
            По дату
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void loadPayments()}
          >
            Применить фильтры
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold"
            onClick={() => void handleAuto()}
          >
            Автосопоставление
          </button>
        </div>
      </div>

      {loading ? <OfficeLoadingState message="Загрузка платежей..." /> : null}
      {error ? <OfficeErrorState message={error} /> : null}

      {!loading && !error && items.length === 0 ? <OfficeEmptyState /> : null}

      {items.length > 0 && !loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-[#5E704F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              onClick={() => void handleBulk("confirm")}
              disabled={!selectedIds.length}
              data-testid="office-billing-reconcile-bulk-confirm"
            >
              Подтвердить
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold disabled:opacity-50"
              onClick={() => void handleBulk("review")}
              disabled={!selectedIds.length}
              data-testid="office-billing-reconcile-bulk-review"
            >
              Нужно проверить
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold disabled:opacity-50"
              onClick={() => void handleBulk("unmatch")}
              disabled={!selectedIds.length}
              data-testid="office-billing-reconcile-bulk-unmatch"
            >
              Снять сопоставление
            </button>
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
                  <th className="px-3 py-2 text-left">Статус</th>
                  <th className="px-3 py-2 text-left">Причина</th>
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
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{item.matchReason || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded border border-zinc-200 px-2 py-1 text-xs"
                          onClick={() => void handleManual(item.id)}
                        >
                          Match вручную
                        </button>
                        <button
                          type="button"
                          className="rounded border border-zinc-200 px-2 py-1 text-xs"
                          onClick={() => void handleConfirm(item.id)}
                        >
                          Подтвердить
                        </button>
                        <button
                          type="button"
                          className="rounded border border-zinc-200 px-2 py-1 text-xs"
                          onClick={() => void handleUnmatch(item.id)}
                        >
                          Снять
                        </button>
                      </div>
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
