"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";
import { CabinetCard } from "../../../../cabinet/_components/CabinetCard";
import { CabinetHeader } from "../../../../cabinet/_components/CabinetHeader";
import { EmptyState } from "../../../../cabinet/_components/EmptyState";

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

const STATUS_LABELS: Record<PaymentConfirmationStatus, string> = {
  submitted: "Отправлено",
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
  bank: "Банковский перевод",
  other: "Другое",
};

export default function ConfirmationsListClient() {
  const [confirmations, setConfirmations] = useState<PaymentConfirmation[]>([]);
  const [summary, setSummary] = useState<ConfirmationsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentConfirmationStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const data = await apiGet<{ confirmations: PaymentConfirmation[]; summary: typeof summary }>(
        `/api/cabinet/payments/confirmations?${params.toString()}`
      );

      setConfirmations(data.confirmations || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedConfirmation = confirmations.find((c) => c.id === selectedId) || null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4" data-testid="cabinet-confirmations-root">
        <CabinetHeader title="Мои подтверждения" />
        <CabinetCard title="Загрузка..." subtitle="Подождите">
          <div className="animate-pulse space-y-3">
            <div className="h-10 rounded bg-zinc-200" />
            <div className="h-10 rounded bg-zinc-200" />
            <div className="h-10 rounded bg-zinc-200" />
          </div>
        </CabinetCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4" data-testid="cabinet-confirmations-root">
        <CabinetHeader title="Мои подтверждения" />
        <CabinetCard title="Ошибка" subtitle="Не удалось загрузить данные">
          <div className="py-4 text-center text-rose-600">{error}</div>
          <button
            onClick={fetchData}
            className="mx-auto block rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white"
          >
            Повторить
          </button>
        </CabinetCard>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4" data-testid="cabinet-confirmations-root">
      <CabinetHeader
        title="Мои подтверждения"
        statusLine={summary ? `Всего: ${summary.total}` : undefined}
      />

      {summary && summary.total > 0 && (
        <div className="grid gap-4 sm:grid-cols-4">
          <CabinetCard title={String(summary.submitted)} subtitle="Отправлено">
            <div className="h-1 rounded bg-amber-400" />
          </CabinetCard>
          <CabinetCard title={String(summary.inReview)} subtitle="На рассмотрении">
            <div className="h-1 rounded bg-blue-400" />
          </CabinetCard>
          <CabinetCard title={String(summary.approved)} subtitle="Подтверждено">
            <div className="h-1 rounded bg-emerald-400" />
          </CabinetCard>
          <CabinetCard title={String(summary.rejected)} subtitle="Отклонено">
            <div className="h-1 rounded bg-rose-400" />
          </CabinetCard>
        </div>
      )}

      <CabinetCard
        title="Подтверждения оплаты"
        subtitle="История отправленных подтверждений"
        actionLabel="Добавить"
        actionHref="/cabinet/payments/confirm"
      >
        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentConfirmationStatus | "all")}
            data-testid="cabinet-confirmations-status-filter"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:w-auto"
          >
            <option value="all">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {confirmations.length > 0 ? (
          <div className="divide-y divide-zinc-100">
            {confirmations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                data-testid={`cabinet-confirmation-row-${c.id}`}
                className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left transition hover:bg-amber-50"
              >
                <div>
                  <div className="font-semibold text-zinc-900">
                    {c.amount.toLocaleString("ru-RU")} ₽
                  </div>
                  <div className="text-xs text-zinc-600">
                    {formatDate(c.paidAt)} · {METHOD_LABELS[c.method]}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}
                  >
                    {STATUS_LABELS[c.status]}
                  </span>
                  <div className="mt-1 text-xs text-zinc-500">
                    {formatDate(c.createdAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Подтверждений пока нет"
            description="Отправьте подтверждение оплаты, чтобы оно появилось здесь."
            actionHref="/cabinet/payments/confirm"
            actionLabel="Сообщить об оплате"
          />
        )}
      </CabinetCard>

      <div className="text-center">
        <Link
          href="/cabinet/payments"
          className="text-sm text-[#5E704F] hover:underline"
        >
          ← Вернуться к взносам
        </Link>
      </div>

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
                  {selectedConfirmation.amount.toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedConfirmation.status]}`}
              >
                {STATUS_LABELS[selectedConfirmation.status]}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm text-zinc-700">
              <div className="flex justify-between">
                <span className="text-zinc-500">Дата оплаты:</span>
                <span>{formatDate(selectedConfirmation.paidAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Способ:</span>
                <span>{METHOD_LABELS[selectedConfirmation.method]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Участок:</span>
                <span>{selectedConfirmation.plotId}</span>
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
                  <div className="mt-1 flex items-center gap-2 rounded bg-zinc-50 p-2">
                    <span>📄</span>
                    <span className="text-zinc-800">{selectedConfirmation.attachment.fileName}</span>
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

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
