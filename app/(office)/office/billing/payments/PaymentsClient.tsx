"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";

type PaymentRow = {
  id: string;
  date: string;
  amount: number;
  payer: string;
  plot: string;
  method: string;
  status: string;
  matchReason: string;
  matchedPlotId: string | null;
  matchStatus: string;
  matchCandidates: string[];
  purpose: string;
  bankRef: string;
  allocatedAmount: number;
  remainingAmount: number;
  remaining: number;
  allocationStatus: string;
  autoAllocateDisabled: boolean;
};

type PaymentsResponse = {
  items: PaymentRow[];
  total: number;
  page: number;
  limit: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

const methodLabel: Record<string, string> = {
  cash: "Наличные",
  card: "Карта",
  bank: "Банк",
};

export default function PaymentsClient({
  initialItems,
  initialTotal,
  initialPage,
  limit,
  initialQuery,
  initialMatchStatus,
}: {
  initialItems: PaymentRow[];
  initialTotal: number;
  initialPage: number;
  limit: number;
  initialQuery: string;
  initialMatchStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<PaymentRow[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [query, setQuery] = useState(initialQuery);
  const [matchStatus, setMatchStatus] = useState(initialMatchStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMatch, setManualMatch] = useState<Record<string, string>>({});

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const updateUrl = (nextPage: number, nextQuery: string, nextMatchStatus: string) => {
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextMatchStatus) params.set("matchStatus", nextMatchStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    params.set("limit", String(limit));
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const loadPayments = async (nextPage: number, nextQuery: string, nextMatchStatus: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nextQuery) params.set("q", nextQuery);
      if (nextMatchStatus) params.set("matchStatus", nextMatchStatus);
      params.set("page", String(nextPage));
      params.set("limit", String(limit));
      const data = await apiGet<PaymentsResponse>(`/api/office/billing/payments?${params.toString()}`);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? nextPage);
      updateUrl(data.page ?? nextPage, nextQuery, nextMatchStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPayments(1, query, matchStatus);
    }, 400);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, matchStatus]);

  useEffect(() => {
    if (page === initialPage) return;
    loadPayments(page, query, matchStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleManualMatch = async (paymentId: string) => {
    const plotId = manualMatch[paymentId]?.trim();
    if (!plotId) {
      setError("Укажите участок для ручного сопоставления");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/billing/payments/match-manual", { paymentId, plotId });
      await loadPayments(page, query, matchStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сопоставления");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="office-billing-payments-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Оплаты</h1>
        <p className="text-sm text-zinc-600">История поступивших оплат.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по плательщику или участку"
            className="w-full max-w-md rounded border border-zinc-300 px-3 py-2 text-sm"
            data-testid="office-billing-payments-search"
          />
          <label className="text-sm text-zinc-600">
            Сопоставление
            <select
              className="ml-2 rounded border border-zinc-300 px-2 py-1 text-sm"
              value={matchStatus}
              onChange={(e) => setMatchStatus(e.target.value)}
              data-testid="office-payments-filter-matchstatus"
            >
              <option value="">Все</option>
              <option value="matched">Сопоставлены</option>
              <option value="ambiguous">Неоднозначные</option>
              <option value="unmatched">Не найдено</option>
            </select>
          </label>
          <span className="text-xs text-zinc-500">Всего: {total}</span>
        </div>
      </div>

      {loading && <OfficeLoadingState message="Загрузка оплат..." testId="office-billing-payments-loading" />}
      {error && (
        <OfficeErrorState
          message={error}
          onRetry={() => loadPayments(page, query, matchStatus)}
          testId="office-billing-payments-error"
        />
      )}

      {!loading && !error && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {items.length === 0 ? (
            <OfficeEmptyState message="Оплат пока нет." testId="office-billing-payments-empty" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Дата</th>
                    <th className="px-3 py-2 text-left">Участок</th>
                    <th className="px-3 py-2 text-left">Плательщик</th>
                    <th className="px-3 py-2 text-left">Способ</th>
                    <th className="px-3 py-2 text-right">Сумма</th>
                    <th className="px-3 py-2 text-right">Распределено</th>
                    <th className="px-3 py-2 text-right">Остаток</th>
                    <th className="px-3 py-2 text-left">Статус</th>
                    <th className="px-3 py-2 text-left">Сопоставление</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {items.map((row) => (
                    <tr key={row.id} data-testid={`office-billing-payments-row-${row.id}`}>
                      <td className="px-3 py-2 text-zinc-700">{new Date(row.date).toLocaleDateString("ru-RU")}</td>
                      <td className="px-3 py-2 text-zinc-900">{row.plot}</td>
                      <td className="px-3 py-2 text-zinc-700">{row.payer}</td>
                      <td className="px-3 py-2 text-zinc-700">{methodLabel[row.method] ?? row.method ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold text-zinc-900">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-700">
                        {formatCurrency(row.allocatedAmount ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-700">{formatCurrency(row.remaining ?? 0)}</td>
                      <td className="px-3 py-2 text-zinc-700">{row.allocationStatus ?? "unallocated"}</td>
                      <td className="px-3 py-2 text-zinc-700">
                        <div className="text-xs text-zinc-500">{row.matchStatus ?? "unmatched"}</div>
                        {row.matchCandidates?.length ? (
                          <div className="text-xs text-zinc-400">Кандидаты: {row.matchCandidates.join(", ")}</div>
                        ) : null}
                        {row.matchStatus !== "matched" ? (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={manualMatch[row.id] ?? ""}
                              onChange={(e) => setManualMatch((prev) => ({ ...prev, [row.id]: e.target.value }))}
                              placeholder="Участок"
                              className="w-28 rounded border border-zinc-200 px-2 py-1 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => void handleManualMatch(row.id)}
                              className="rounded border border-zinc-200 px-2 py-1 text-xs"
                              data-testid="office-payment-match-manual"
                            >
                              Сопоставить
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-zinc-600">
          <span>
            Страница {page} из {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-50"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-50"
            >
              Вперёд
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
