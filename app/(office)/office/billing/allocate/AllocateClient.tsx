"use client";

import { useEffect, useMemo, useState } from "react";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";

type PaymentRow = {
  id: string;
  date: string;
  amount: number;
  payer: string;
  plot: string;
  status: "unmatched" | "needs_review" | "matched";
  allocatedAmount: number;
  remainingAmount: number;
  allocationStatus: string;
  autoAllocateDisabled: boolean;
};

type TabKey = "unmatched" | "unallocated" | "remaining" | "disputed";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default function AllocateClient() {
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<TabKey>("remaining");
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: "auto"; ids?: string[] }
    | { type: "manual"; payload: { paymentId: string; accrualId: string; amount: number } }
    | { type: "unapply"; ids: string[] }
    | null
  >(null);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const totalPages = Math.max(1, Math.ceil(total / 10));

  const buildPeriodRange = (value: string) => {
    const [year, month] = value.split("-");
    if (!year || !month) return null;
    const start = `${year}-${month}-01`;
    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    endDate.setUTCDate(0);
    return {
      from: start,
      to: endDate.toISOString().slice(0, 10),
    };
  };

  const loadPayments = async (nextPage = page, nextPeriod = period) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const range = buildPeriodRange(nextPeriod);
      if (range) {
        params.set("from", range.from);
        params.set("to", range.to);
      }
      params.set("page", String(nextPage));
      params.set("limit", "10");
      const data = await apiGet<{ items: PaymentRow[]; total?: number; page?: number }>(
        `/api/office/billing/payments?${params.toString()}`,
      );
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? nextPage);
      setSelected({});
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Ошибка загрузки платежей";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayments(1, period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const runAuto = async (ids?: string[]) => {
    setLoading(true);
    setError(null);
    setPendingAction({ type: "auto", ids });
    try {
      await apiPost("/api/office/billing/allocate/auto", {
        paymentIds: ids,
        period,
        reason: showReason && reason.trim() ? reason.trim() : undefined,
      });
      await loadPayments(page, period);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "period_closed" || err.status === 409)) {
        setShowReason(true);
      }
      const message = err instanceof ApiError ? err.message : "Ошибка автораспределения";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleManual = async (paymentId: string) => {
    const accrualId = window.prompt("Введите ID начисления", "c1");
    if (!accrualId) return;
    const amountRaw = window.prompt("Введите сумму распределения", "1000");
    const amount = amountRaw ? Number(amountRaw) : NaN;
    if (!Number.isFinite(amount)) return;

    setLoading(true);
    setError(null);
    setPendingAction({ type: "manual", payload: { paymentId, accrualId, amount } });
    try {
      await apiPost("/api/office/billing/allocate/manual", {
        paymentId,
        accrualId,
        amount,
        reason: showReason && reason.trim() ? reason.trim() : undefined,
      });
      await loadPayments(page, period);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "period_closed" || err.status === 409)) {
        setShowReason(true);
      }
      const message = err instanceof ApiError ? err.message : "Ошибка ручного распределения";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUnapply = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    setError(null);
    setPendingAction({ type: "unapply", ids: selectedIds });
    try {
      await Promise.all(
        selectedIds.map((paymentId) =>
          apiPost("/api/office/billing/allocate/unapply", {
            paymentId,
            reason: showReason && reason.trim() ? reason.trim() : undefined,
          }),
        ),
      );
      await loadPayments(page, period);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "period_closed" || err.status === 409)) {
        setShowReason(true);
      }
      const message = err instanceof ApiError ? err.message : "Ошибка снятия распределений";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const retryWithReason = () => {
    if (!pendingAction) return;
    setLoading(true);
    setError(null);
    if (pendingAction.type === "auto") {
      void runAuto(pendingAction.ids);
    } else if (pendingAction.type === "manual") {
      const { paymentId, accrualId, amount } = pendingAction.payload;
      void apiPost("/api/office/billing/allocate/manual", {
        paymentId,
        accrualId,
        amount,
        reason: reason.trim(),
      })
        .then(() => loadPayments(page, period))
        .catch((err) => {
          const message = err instanceof ApiError ? err.message : "Ошибка ручного распределения";
          setError(message);
        })
        .finally(() => setLoading(false));
    } else if (pendingAction.type === "unapply") {
      void Promise.all(
        pendingAction.ids.map((paymentId) =>
          apiPost("/api/office/billing/allocate/unapply", { paymentId, reason: reason.trim() }),
        ),
      )
        .then(() => loadPayments(page, period))
        .catch((err) => {
          const message = err instanceof ApiError ? err.message : "Ошибка снятия распределений";
          setError(message);
        })
        .finally(() => setLoading(false));
    }
  };

  const handleApplyCredit = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/billing/credits/apply", { paymentIds: selectedIds });
      await loadPayments(page, period);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Ошибка применения кредита";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoAllocate = async (paymentId: string, disabled: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/billing/payments/auto-allocate", { paymentId, disabled });
      await loadPayments(page, period);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Ошибка обновления авто-распределения";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      switch (tab) {
        case "unmatched":
          return item.status === "unmatched";
        case "unallocated":
          return item.allocationStatus === "unallocated";
        case "disputed":
          return item.status === "needs_review";
        case "remaining":
        default:
          return item.remainingAmount > 0;
      }
    });
  }, [items, tab]);

  return (
    <div className="space-y-4" data-testid="office-billing-allocate-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Распределение платежей</h1>
        <p className="text-sm text-zinc-600">Платежи с остатком для закрытия начислений.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-semibold text-zinc-700">
          Период оплат
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="mt-2 w-full max-w-xs rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            tab === "unmatched" ? "bg-[#5E704F] text-white" : "border border-zinc-200 text-zinc-700"
          }`}
          onClick={() => setTab("unmatched")}
          data-testid="office-billing-allocate-tab-unmatched"
        >
          Несопоставленные
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            tab === "unallocated" ? "bg-[#5E704F] text-white" : "border border-zinc-200 text-zinc-700"
          }`}
          onClick={() => setTab("unallocated")}
          data-testid="office-billing-allocate-tab-unallocated"
        >
          Не распределены
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            tab === "remaining" ? "bg-[#5E704F] text-white" : "border border-zinc-200 text-zinc-700"
          }`}
          onClick={() => setTab("remaining")}
          data-testid="office-billing-allocate-tab-remaining"
        >
          Остатки
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            tab === "disputed" ? "bg-[#5E704F] text-white" : "border border-zinc-200 text-zinc-700"
          }`}
          onClick={() => setTab("disputed")}
          data-testid="office-billing-allocate-tab-disputed"
        >
          Спорные
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void runAuto()}
            data-testid="office-billing-allocate-auto"
          >
            Автораспределить
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold"
            onClick={() => void runAuto(selectedIds)}
            disabled={!selectedIds.length}
          >
            Автораспределить выбранные
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold"
            onClick={() => void handleBulkUnapply()}
            disabled={!selectedIds.length}
          >
            Снять распределение
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold"
            onClick={() => void handleApplyCredit()}
            disabled={!selectedIds.length}
            data-testid="office-billing-apply-credit"
          >
            Применить кредит
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
      {!loading && !error && filteredItems.length === 0 ? (
        <OfficeEmptyState message="Нет платежей для выбранного фильтра." />
      ) : null}

      {filteredItems.length > 0 && !loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">Выбор</th>
                  <th className="px-3 py-2 text-left">Дата</th>
                  <th className="px-3 py-2 text-left">Сумма</th>
                  <th className="px-3 py-2 text-left">Плательщик</th>
                  <th className="px-3 py-2 text-left">Участок</th>
                  <th className="px-3 py-2 text-right">Распределено</th>
                  <th className="px-3 py-2 text-right">Остаток</th>
                  <th className="px-3 py-2 text-center">Авто</th>
                  <th className="px-3 py-2 text-left">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} data-testid={`office-billing-allocate-row-${item.id}`}>
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
                    <td className="px-3 py-2 text-right text-zinc-700">{formatCurrency(item.allocatedAmount)}</td>
                    <td className="px-3 py-2 text-right text-zinc-700">{formatCurrency(item.remainingAmount)}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          item.autoAllocateDisabled
                            ? "border border-rose-200 text-rose-700"
                            : "border border-emerald-200 text-emerald-700"
                        }`}
                        onClick={() => void toggleAutoAllocate(item.id, !item.autoAllocateDisabled)}
                        data-testid="office-billing-payment-toggle-auto-disabled"
                      >
                        {item.autoAllocateDisabled ? "OFF" : "ON"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="rounded border border-zinc-200 px-2 py-1 text-xs"
                        onClick={() => void handleManual(item.id)}
                        data-testid="office-billing-allocate-manual-submit"
                      >
                        Распределить вручную
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
              onClick={() => void loadPayments(Math.max(1, page - 1), period)}
              disabled={page <= 1}
            >
              Назад
            </button>
            <button
              type="button"
              className="rounded border border-zinc-200 px-3 py-1 text-xs font-semibold"
              onClick={() => void loadPayments(Math.min(totalPages, page + 1), period)}
              disabled={page >= totalPages}
            >
              Вперёд
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
