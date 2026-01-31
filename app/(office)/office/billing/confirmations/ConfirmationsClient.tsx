"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";

type PaymentConfirmationStatus = "submitted" | "in_review" | "approved" | "rejected";
type PaymentMethod = "cash" | "card" | "bank" | "other";

type PaymentConfirmation = {
  id: string;
  userId: string;
  plotId: string;
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  comment: string | null;
  attachment: {
    fileName: string;
    filePath: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  } | null;
  status: PaymentConfirmationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  linkedPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
};

type ConfirmationsSummary = {
  total: number;
  submitted: number;
  inReview: number;
  approved: number;
  rejected: number;
};

type ConfirmationsResponse = {
  confirmations: PaymentConfirmation[];
  summary: ConfirmationsSummary;
};

const STATUS_LABELS: Record<PaymentConfirmationStatus, string> = {
  submitted: "Новое",
  in_review: "На рассмотрении",
  approved: "Подтверждено",
  rejected: "Отклонено",
};

const STATUS_COLORS: Record<PaymentConfirmationStatus, string> = {
  submitted: "bg-amber-100 text-amber-800",
  in_review: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Наличные",
  card: "Карта",
  bank: "Банк. перевод",
  other: "Другое",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ConfirmationsClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConfirmationsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentConfirmationStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      const result = await apiGet<ConfirmationsResponse>(`/api/office/billing/confirmations?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedConfirmation = data?.confirmations.find((c) => c.id === selectedId) || null;

  const handleApprove = async (createPayment: boolean) => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      await apiPost(`/api/office/billing/confirmations/${selectedId}/approve`, { createPayment });
      setSelectedId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка одобрения");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await apiPost(`/api/office/billing/confirmations/${selectedId}/reject`, { reason: rejectReason.trim() });
      setSelectedId(null);
      setShowRejectModal(false);
      setRejectReason("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отклонения");
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = () => {
    setShowRejectModal(true);
    setRejectReason("");
  };

  const pendingCount = (data?.summary.submitted || 0) + (data?.summary.inReview || 0);

  return (
    <div className="space-y-4" data-testid="office-confirmations-root">
      {/* Controls */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Статус</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PaymentConfirmationStatus | "all")}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
              data-testid="office-confirmations-status-filter"
            >
              <option value="all">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Поиск</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Участок или комментарий"
              className="w-48 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
              data-testid="office-confirmations-search"
            />
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:opacity-50"
            data-testid="office-confirmations-refresh"
          >
            Обновить
          </button>
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
            <span className="text-xs text-zinc-500">Всего:</span>{" "}
            <span className="font-semibold text-zinc-900">{data.summary.total}</span>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-xs text-amber-700">Ожидают:</span>{" "}
            <span className="font-semibold text-amber-800">{pendingCount}</span>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="text-xs text-emerald-700">Подтверждено:</span>{" "}
            <span className="font-semibold text-emerald-800">{data.summary.approved}</span>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            <span className="text-xs text-rose-700">Отклонено:</span>{" "}
            <span className="font-semibold text-rose-800">{data.summary.rejected}</span>
          </div>
        </div>
      )}

      {/* States */}
      {loading && <OfficeLoadingState message="Загрузка подтверждений..." testId="office-confirmations-loading" />}
      {error && <OfficeErrorState message={error} onRetry={loadData} testId="office-confirmations-error" />}

      {/* Table */}
      {!loading && data && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {data.confirmations.length === 0 ? (
            <OfficeEmptyState message="Нет подтверждений для рассмотрения." testId="office-confirmations-empty" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Участок</th>
                    <th className="px-3 py-2 text-left">Дата оплаты</th>
                    <th className="px-3 py-2 text-left">Способ</th>
                    <th className="px-3 py-2 text-right">Сумма</th>
                    <th className="px-3 py-2 text-left">Статус</th>
                    <th className="px-3 py-2 text-left">Создано</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {data.confirmations.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className="cursor-pointer transition hover:bg-zinc-50"
                      data-testid={`office-confirmations-row-${c.id}`}
                    >
                      <td className="px-3 py-2 font-medium text-zinc-900">{c.plotId}</td>
                      <td className="px-3 py-2 text-zinc-700">{formatDate(c.paidAt)}</td>
                      <td className="px-3 py-2 text-zinc-700">{METHOD_LABELS[c.method]}</td>
                      <td className="px-3 py-2 text-right font-semibold text-zinc-900">
                        {formatCurrency(c.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-500">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Подтверждение оплаты
                </div>
                <div className="text-2xl font-semibold text-zinc-900">
                  {formatCurrency(selectedConfirmation.amount)}
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedConfirmation.status]}`}>
                {STATUS_LABELS[selectedConfirmation.status]}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm text-zinc-700">
              <div className="flex justify-between">
                <span className="text-zinc-500">Участок:</span>
                <span className="font-medium">{selectedConfirmation.plotId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Дата оплаты:</span>
                <span>{formatDate(selectedConfirmation.paidAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Способ:</span>
                <span>{METHOD_LABELS[selectedConfirmation.method]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Отправлено:</span>
                <span>{formatDateTime(selectedConfirmation.createdAt)}</span>
              </div>
              {selectedConfirmation.comment && (
                <div className="pt-2">
                  <span className="text-zinc-500">Комментарий:</span>
                  <p className="mt-1 rounded bg-zinc-50 p-2 text-zinc-800">
                    {selectedConfirmation.comment}
                  </p>
                </div>
              )}
              {selectedConfirmation.attachment && (
                <div className="pt-2">
                  <span className="text-zinc-500">Приложение:</span>
                  <div className="mt-1">
                    {selectedConfirmation.attachment.mimeType.startsWith("image/") ? (
                      <img
                        src={selectedConfirmation.attachment.filePath}
                        alt="Чек"
                        className="max-h-64 rounded border border-zinc-200"
                      />
                    ) : (
                      <div className="flex items-center gap-2 rounded bg-zinc-50 p-2">
                        <span>📄</span>
                        <span className="text-zinc-800">{selectedConfirmation.attachment.fileName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedConfirmation.status === "rejected" && selectedConfirmation.rejectReason && (
                <div className="pt-2">
                  <span className="text-rose-600">Причина отклонения:</span>
                  <p className="mt-1 rounded border border-rose-200 bg-rose-50 p-2 text-rose-800">
                    {selectedConfirmation.rejectReason}
                  </p>
                </div>
              )}
              {selectedConfirmation.reviewedAt && (
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Рассмотрено:</span>
                  <span>{formatDateTime(selectedConfirmation.reviewedAt)}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Закрыть
              </button>
              {(selectedConfirmation.status === "submitted" || selectedConfirmation.status === "in_review") && (
                <>
                  <button
                    type="button"
                    onClick={openRejectModal}
                    disabled={actionLoading}
                    className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-400 disabled:opacity-50"
                    data-testid="office-confirmations-reject"
                  >
                    Отклонить
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(true)}
                    disabled={actionLoading}
                    className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
                    data-testid="office-confirmations-approve"
                  >
                    {actionLoading ? "Обработка..." : "Подтвердить"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-zinc-900">Отклонить подтверждение</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Укажите причину отклонения для уведомления жителя.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Причина отклонения..."
              rows={3}
              className="mt-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#5E704F] focus:outline-none"
              data-testid="office-confirmations-reject-reason"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                data-testid="office-confirmations-reject-confirm"
              >
                {actionLoading ? "Обработка..." : "Отклонить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
