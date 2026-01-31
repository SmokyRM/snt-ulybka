"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";
import type { NotificationDraft, NotificationDraftStatus, NotificationChannel } from "@/lib/notificationDrafts.store";

type DraftsResponse = {
  drafts: NotificationDraft[];
  summary: {
    total: number;
    draft: number;
    approved: number;
    sending: number;
    sent: number;
    failed: number;
    skipped: number;
    cancelled: number;
  };
};

type SendPreviewResponse = {
  willSend: number;
  skipped: number;
  alreadySent: number;
  invalidRecipient: number;
  rateLimitRemaining: number;
  rateLimitResetInMs: number;
  sample: Array<{
    id: string;
    plotLabel: string;
    residentName: string;
    body: string;
    skipReason: string | null;
  }>;
  skipReasons: Record<string, number>;
  telegramConfigured: boolean;
  rateLimit: {
    maxMessages: number;
    windowMs: number;
    sentInWindow: number;
    remaining: number;
    resetInMs: number;
  };
};

type SendConfirmResponse = {
  sent: number;
  failed: number;
  skipped: number;
  rateLimited: number;
  results: Array<{
    id: string;
    status: "sent" | "failed" | "skipped" | "rate_limited";
    error?: string;
    externalId?: string;
  }>;
  rateLimit: {
    maxMessages: number;
    windowMs: number;
    sentInWindow: number;
    remaining: number;
    resetInMs: number;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

const statusLabel: Record<NotificationDraftStatus, string> = {
  draft: "Черновик",
  approved: "Утверждено",
  sending: "Отправка...",
  sent: "Отправлено",
  failed: "Ошибка",
  skipped: "Пропущено",
  cancelled: "Отменено",
};

const statusColor: Record<NotificationDraftStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  approved: "bg-amber-100 text-amber-800",
  sending: "bg-blue-100 text-blue-800",
  sent: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-orange-100 text-orange-700",
  cancelled: "bg-zinc-100 text-zinc-500",
};

const channelLabel: Record<NotificationChannel, string> = {
  telegram: "Telegram",
  email: "Email",
  sms: "SMS",
  print: "Печать",
};

export default function NotificationDraftsClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DraftsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<NotificationDraftStatus | "">("");
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | "">("");
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Send state
  const [sendPreview, setSendPreview] = useState<SendPreviewResponse | null>(null);
  const [sendResult, setSendResult] = useState<SendConfirmResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (channelFilter) params.set("channel", channelFilter);
      const url = `/api/office/notifications/drafts${params.toString() ? `?${params.toString()}` : ""}`;
      const result = await apiGet<DraftsResponse>(url);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiPost<{ created: number }>("/api/office/notifications/drafts/generate", {
        channel: "telegram",
        minDebt: 1000,
      });
      setSuccess(`Создано ${result.created} уведомлений`);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      await apiPost(`/api/office/notifications/drafts/${id}/approve`, {});
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка утверждения");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      await apiDelete(`/api/office/notifications/drafts/${id}`);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreviewSend = async () => {
    setPreviewLoading(true);
    setError(null);
    setSendPreview(null);
    setSendResult(null);
    try {
      const result = await apiPost<SendPreviewResponse>("/api/office/notifications/send/preview", {
        channel: "telegram",
        limit: 50,
      });
      setSendPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка предпросмотра");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmSend = async () => {
    setConfirmLoading(true);
    setError(null);
    setSendResult(null);
    try {
      const result = await apiPost<SendConfirmResponse>("/api/office/notifications/send/confirm", {
        channel: "telegram",
        limit: 50,
      });
      setSendResult(result);
      setSendPreview(null);
      setSuccess(`Отправлено: ${result.sent}, Ошибки: ${result.failed}, Пропущено: ${result.skipped}`);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="office-notifications-root">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Уведомления должникам</h1>
          <p className="text-sm text-zinc-600">Создание и отправка уведомлений о задолженности.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePreviewSend}
            disabled={previewLoading}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:opacity-50"
            data-testid="office-notifications-preview-send"
          >
            {previewLoading ? "Загрузка..." : "Предпросмотр отправки"}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41] disabled:opacity-50"
            data-testid="office-notifications-generate"
          >
            {generating ? "Создание..." : "Создать уведомления"}
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
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
            <span className="text-xs text-zinc-500">Черновики:</span>{" "}
            <span className="font-semibold text-zinc-700">{data.summary.draft}</span>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
            <span className="text-xs text-zinc-500">Утверждено:</span>{" "}
            <span className="font-semibold text-amber-700">{data.summary.approved}</span>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
            <span className="text-xs text-zinc-500">Отправлено:</span>{" "}
            <span className="font-semibold text-emerald-700">{data.summary.sent}</span>
          </div>
          {data.summary.failed > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-xs text-red-500">Ошибки:</span>{" "}
              <span className="font-semibold text-red-700">{data.summary.failed}</span>
            </div>
          )}
          {data.summary.skipped > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
              <span className="text-xs text-orange-500">Пропущено:</span>{" "}
              <span className="font-semibold text-orange-700">{data.summary.skipped}</span>
            </div>
          )}
        </div>
      )}

      {/* Send Preview Panel */}
      {sendPreview && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm" data-testid="office-notifications-preview-panel">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Предпросмотр отправки</h2>
              <p className="text-sm text-zinc-600">
                {sendPreview.telegramConfigured ? "Telegram настроен" : "⚠️ TELEGRAM_BOT_TOKEN не настроен"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSendPreview(null)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-white"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={confirmLoading || sendPreview.willSend === 0 || !sendPreview.telegramConfigured}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                data-testid="office-notifications-confirm-send"
              >
                {confirmLoading ? "Отправка..." : `Отправить (${sendPreview.willSend})`}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="text-xs text-emerald-600">Будет отправлено:</span>{" "}
              <span className="font-semibold text-emerald-800">{sendPreview.willSend}</span>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
              <span className="text-xs text-orange-600">Пропущено:</span>{" "}
              <span className="font-semibold text-orange-800">{sendPreview.skipped}</span>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-xs text-red-600">Без получателя:</span>{" "}
              <span className="font-semibold text-red-800">{sendPreview.invalidRecipient}</span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
              <span className="text-xs text-zinc-500">Лимит:</span>{" "}
              <span className="font-semibold text-zinc-700">
                {sendPreview.rateLimit.remaining}/{sendPreview.rateLimit.maxMessages}
              </span>
            </div>
          </div>

          {/* Skip reasons */}
          {Object.keys(sendPreview.skipReasons).length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-zinc-700">Причины пропуска:</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(sendPreview.skipReasons).map(([reason, count]) => (
                  <span key={reason} className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                    {reason}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sample */}
          {sendPreview.sample.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-700">Примеры сообщений:</h3>
              <div className="space-y-2">
                {sendPreview.sample.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 ${
                      item.skipReason ? "border-orange-200 bg-orange-50" : "border-zinc-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{item.plotLabel} — {item.residentName}</span>
                      {item.skipReason && (
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-700">
                          {item.skipReason}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-700 line-clamp-2">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send Result Panel */}
      {sendResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm" data-testid="office-notifications-result-panel">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Результаты отправки</h2>
            <button
              type="button"
              onClick={() => setSendResult(null)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-white"
            >
              Закрыть
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-3">
            <div className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2">
              <span className="text-xs text-emerald-600">Отправлено:</span>{" "}
              <span className="font-semibold text-emerald-800">{sendResult.sent}</span>
            </div>
            <div className="rounded-lg border border-red-300 bg-red-100 px-3 py-2">
              <span className="text-xs text-red-600">Ошибки:</span>{" "}
              <span className="font-semibold text-red-800">{sendResult.failed}</span>
            </div>
            <div className="rounded-lg border border-orange-300 bg-orange-100 px-3 py-2">
              <span className="text-xs text-orange-600">Пропущено:</span>{" "}
              <span className="font-semibold text-orange-800">{sendResult.skipped}</span>
            </div>
            {sendResult.rateLimited > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2">
                <span className="text-xs text-amber-600">Лимит:</span>{" "}
                <span className="font-semibold text-amber-800">{sendResult.rateLimited}</span>
              </div>
            )}
          </div>

          {/* Failed list */}
          {sendResult.results.filter((r) => r.status === "failed").length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-red-700">Ошибки:</h3>
              <div className="space-y-1">
                {sendResult.results
                  .filter((r) => r.status === "failed")
                  .slice(0, 5)
                  .map((r) => (
                    <div key={r.id} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                      {r.id}: {r.error}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Статус</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as NotificationDraftStatus | "")}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
              data-testid="office-notifications-status-filter"
            >
              <option value="">Все статусы</option>
              <option value="draft">Черновик</option>
              <option value="approved">Утверждено</option>
              <option value="sending">Отправка...</option>
              <option value="sent">Отправлено</option>
              <option value="failed">Ошибка</option>
              <option value="skipped">Пропущено</option>
              <option value="cancelled">Отменено</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Канал</label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as NotificationChannel | "")}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
              data-testid="office-notifications-channel-filter"
            >
              <option value="">Все каналы</option>
              <option value="telegram">Telegram</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="print">Печать</option>
            </select>
          </div>
        </div>
      </div>

      {/* States */}
      {loading && <OfficeLoadingState message="Загрузка уведомлений..." testId="office-notifications-loading" />}
      {error && <OfficeErrorState message={error} onRetry={loadDrafts} testId="office-notifications-error" />}
      {success && (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          data-testid="office-notifications-success"
        >
          {success}
        </div>
      )}

      {/* Table */}
      {!loading && data && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {data.drafts.length === 0 ? (
            <OfficeEmptyState message="Уведомлений пока нет." testId="office-notifications-empty" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Участок</th>
                    <th className="px-3 py-2 text-left">Получатель</th>
                    <th className="px-3 py-2 text-right">Долг</th>
                    <th className="px-3 py-2 text-left">Канал</th>
                    <th className="px-3 py-2 text-left">Статус</th>
                    <th className="px-3 py-2 text-left">Дата</th>
                    <th className="px-3 py-2 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {data.drafts.map((draft) => (
                    <tr key={draft.id} data-testid={`office-notifications-row-${draft.id}`}>
                      <td className="px-3 py-2 text-zinc-900">{draft.plotLabel}</td>
                      <td className="px-3 py-2">
                        <div className="text-zinc-700">{draft.residentName}</div>
                        {draft.recipientTgChatId ? (
                          <div className="text-xs text-zinc-400">TG: {draft.recipientTgChatId}</div>
                        ) : (
                          <div className="text-xs text-orange-500">Нет TG ID</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-zinc-900">
                        {formatCurrency(draft.debtAmount)}
                      </td>
                      <td className="px-3 py-2 text-zinc-700">{channelLabel[draft.channel]}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[draft.status]}`}
                        >
                          {statusLabel[draft.status]}
                        </span>
                        {draft.lastError && (
                          <div className="mt-1 text-xs text-red-500 truncate max-w-[150px]" title={draft.lastError}>
                            {draft.lastError}
                          </div>
                        )}
                        {draft.skipReason && (
                          <div className="mt-1 text-xs text-orange-500">{draft.skipReason}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {new Date(draft.createdAt).toLocaleDateString("ru-RU")}
                        {draft.sentAt && (
                          <div className="text-xs text-emerald-600">
                            Отправлено: {new Date(draft.sentAt).toLocaleString("ru-RU")}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {draft.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => handleApprove(draft.id)}
                              disabled={actionLoading === draft.id}
                              className="rounded px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                              data-testid={`office-notifications-approve-${draft.id}`}
                            >
                              Утвердить
                            </button>
                          )}
                          {(draft.status === "draft" || draft.status === "cancelled" || draft.status === "failed" || draft.status === "skipped") && (
                            <button
                              type="button"
                              onClick={() => handleDelete(draft.id)}
                              disabled={actionLoading === draft.id}
                              className="rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              data-testid={`office-notifications-delete-${draft.id}`}
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
