"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import OfficeLoadingState from "../_components/OfficeLoadingState";
import OfficeErrorState from "../_components/OfficeErrorState";
import OfficeEmptyState from "../_components/OfficeEmptyState";

type OfficeJob = {
  id: string;
  type: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  createdAt: string;
  updatedAt: string;
  error?: string | null;
  resultData?: Record<string, unknown> | null;
};

const statusLabel: Record<OfficeJob["status"], string> = {
  queued: "В очереди",
  running: "В работе",
  done: "Готово",
  failed: "Ошибка",
};

export default function OfficeJobsClient() {
  const [items, setItems] = useState<OfficeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ items: OfficeJob[] }>("/api/office/jobs");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки заданий");
    } finally {
      setLoading(false);
    }
  };

  const retryJob = async (jobId: string) => {
    setRetryingId(jobId);
    setError(null);
    try {
      await apiPost(`/api/office/jobs/${jobId}/retry`, {});
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка перезапуска задания");
    } finally {
      setRetryingId(null);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(() => {
      void loadJobs();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3" data-testid="office-jobs-root">
      {loading ? (
        <OfficeLoadingState message="Загрузка заданий..." testId="office-jobs-loading" />
      ) : error ? (
        <OfficeErrorState message={error} onRetry={loadJobs} testId="office-jobs-error" />
      ) : !items.length ? (
        <OfficeEmptyState message="Заданий пока нет." testId="office-jobs-empty" />
      ) : (
        items.map((job) => (
          <div
            key={job.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            data-testid={`office-jobs-row-${job.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900">{job.type}</div>
                <div className="text-xs text-zinc-500">Создано: {new Date(job.createdAt).toLocaleString("ru-RU")}</div>
              </div>
              <span
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700"
                data-testid={`office-job-status-${job.id}`}
              >
                {statusLabel[job.status]}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Прогресс</span>
                <span data-testid={`office-job-progress-${job.id}`}>{job.progress}%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-zinc-100">
                <div
                  className="h-2 rounded-full bg-[#5E704F]"
                  style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
                />
              </div>
            </div>
            {job.status === "failed" && job.error ? (
              <div className="mt-2 text-xs text-rose-600">{job.error}</div>
            ) : null}
            {job.status === "failed" ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void retryJob(job.id)}
                  className="rounded-full border border-[#5E704F] px-3 py-1 text-xs font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={retryingId === job.id}
                >
                  {retryingId === job.id ? "Перезапуск..." : "Повторить"}
                </button>
              </div>
            ) : null}
            {job.status === "done" && job.resultData?.links ? (
              <div className="mt-2 text-xs text-zinc-600">
                Ссылки готовы: {(job.resultData.links as Array<unknown>).length}
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
