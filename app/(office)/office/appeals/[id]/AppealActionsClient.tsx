"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppealStatus } from "@/lib/office/types";
import { apiPost } from "@/lib/api/client";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeLoadingState from "../../_components/OfficeLoadingState";

type Props = {
  appealId: string;
  currentStatus: AppealStatus;
  onUpdate: () => void;
};

export default function AppealActionsClient({ appealId, currentStatus, onUpdate }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AppealStatus>(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleStatusUpdate = async (status: AppealStatus, comment?: string) => {
    setLoading(status);
    setError(null);
    setSuccess(null);
    try {
      await apiPost<{ appeal: { id: string } }>(`/api/office/appeals/${appealId}/status`, {
        status,
        comment,
      });
      setSuccess("Статус обновлён");
      onUpdate();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления статуса");
    } finally {
      setLoading(null);
    }
  };

  const handleStatusSave = async () => {
    if (selectedStatus === currentStatus) return;
    await handleStatusUpdate(selectedStatus);
  };

  const handleComment = async (text: string) => {
    setLoading("comment");
    setError(null);
    setSuccess(null);
    try {
      await apiPost<{ appeal: { id: string } }>(`/api/office/appeals/${appealId}/comments`, { text });
      setSuccess("Комментарий добавлен");
      onUpdate();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка добавления комментария");
    } finally {
      setLoading(null);
    }
  };

  const handleRequestInfoWithTemplate = async () => {
    setLoading("request_info");
    setError(null);
    setSuccess(null);
    try {
      await apiPost<{ appeal: { id: string } }>(`/api/office/appeals/${appealId}/request-info`);
      setSuccess("Запрос отправлен");
      onUpdate();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка запроса уточнения");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4" data-testid="office-appeal-page">
      {/* Error state */}
      {error ? (
        <OfficeErrorState
          message={error}
          onRetry={() => setError(null)}
          testId="office-error-state"
        />
      ) : null}

      {loading ? <OfficeLoadingState message="Сохраняем изменения..." testId="office-loading-state" /> : null}

      {/* Success state */}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" data-testid="office-success-state">
          {success}
        </div>
      )}

      {/* Status select control */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-zinc-800">Статус:</label>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as AppealStatus)}
          disabled={loading !== null}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none disabled:opacity-50"
          data-testid="office-appeals-status-select"
        >
          <option value="new">Новое</option>
          <option value="in_progress">В работе</option>
          <option value="needs_info">Требует уточнения</option>
          <option value="closed">Готово</option>
        </select>
        <button
          type="button"
          onClick={handleStatusSave}
          disabled={loading !== null || selectedStatus === currentStatus}
          className="inline-flex items-center justify-center rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41] disabled:opacity-50"
          data-testid="office-appeals-status-save"
        >
          {loading === selectedStatus ? "Сохранение..." : "Сохранить"}
        </button>
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
            currentStatus === "new"
              ? "bg-blue-100 text-blue-800"
              : currentStatus === "in_progress"
                ? "bg-amber-100 text-amber-800"
                : currentStatus === "needs_info"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-emerald-100 text-emerald-800"
          }`}
          data-testid="appeal-status"
        >
          {currentStatus === "new"
            ? "Новое"
            : currentStatus === "in_progress"
              ? "В работе"
              : currentStatus === "needs_info"
                ? "Требует уточнения"
                : "Закрыто"}
        </span>
      </div>

      {/* Блок действий */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-zinc-800">Действия:</div>

        {currentStatus === "new" && (
          <button
            onClick={() => handleStatusUpdate("in_progress")}
            disabled={loading === "in_progress"}
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
            data-testid="appeal-action-take"
          >
            {loading === "in_progress" ? "Обновление..." : "Взять в работу"}
          </button>
        )}

        {(currentStatus === "new" || currentStatus === "in_progress") && (
          <>
            <button
              onClick={handleRequestInfoWithTemplate}
              disabled={loading === "request_info"}
              className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
              data-testid="appeal-action-request-info-template"
            >
              {loading === "request_info" ? "Отправка..." : "Запросить уточнение (шаблон)"}
            </button>
            <CommentForm
              onSubmit={(text) => handleStatusUpdate("needs_info", text)}
              buttonLabel="Запросить уточнение"
              placeholder="Укажите, какая информация нужна..."
              loading={loading === "needs_info"}
              testId="appeal-action-clarify"
            />
          </>
        )}

        {(currentStatus === "new" || currentStatus === "in_progress" || currentStatus === "needs_info") && (
          <CommentForm
            onSubmit={(text) => handleStatusUpdate("closed", text || undefined)}
            buttonLabel="Закрыть"
            placeholder="Комментарий (необязательно)..."
            required={false}
            loading={loading === "closed"}
            testId="appeal-action-close"
          />
        )}
      </div>
    </div>
  );
}

function CommentForm({
  onSubmit,
  buttonLabel,
  placeholder,
  required = true,
  loading,
  testId,
}: {
  onSubmit: (text: string) => void;
  buttonLabel: string;
  placeholder: string;
  required?: boolean;
  loading?: boolean;
  testId?: string;
}) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (required && !text.trim()) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
        required={required}
      />
      <button
        type="submit"
        disabled={loading || (required && !text.trim())}
        className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
          buttonLabel === "Закрыть"
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-orange-600 hover:bg-orange-700"
        }`}
        data-testid={testId}
      >
        {loading ? "Отправка..." : buttonLabel}
      </button>
    </form>
  );
}
