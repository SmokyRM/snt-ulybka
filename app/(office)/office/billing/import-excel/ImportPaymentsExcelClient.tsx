"use client";

import { useState, useEffect } from "react";
import { readOk, ApiError } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";

type ImportRowError = {
  rowIndex: number;
  message: string;
};

type ImportTotals = {
  total: number;
  valid: number;
  invalid: number;
};

type ImportResult = {
  totals: ImportTotals;
  errors: ImportRowError[];
};

type OfficeJob = {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  resultData?: ImportResult | null;
  error?: string | null;
};

export default function ImportPaymentsExcelClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobMode, setJobMode] = useState<"preview" | "apply" | null>(null);
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const runImport = async (mode: "preview" | "apply") => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setJobMode(mode);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      if (showReason && reason.trim()) {
        formData.append("reason", reason.trim());
      }

      const response = await fetch("/api/office/billing/import-payments-xlsx", {
        method: "POST",
        body: formData,
      });
      const data = await readOk<{ jobId: string }>(response);
      setJobId(data.jobId);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "period_closed" || err.status === 409)) {
        setShowReason(true);
      }
      setError(err instanceof Error ? err.message : "Ошибка импорта");
      setLoading(false);
    }
  };

  const retryWithReason = () => {
    if (jobMode) {
      void runImport(jobMode);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    let active = true;

    const poll = async () => {
      try {
        const response = await fetch(`/api/office/jobs/${jobId}`);
        const data = await readOk<{ job: OfficeJob }>(response);
        if (!active) return;
        const job = data.job;
        if (job.status === "done") {
          if (jobMode === "preview") {
            setPreview(job.resultData ?? null);
          } else if (jobMode === "apply") {
            setResult(job.resultData ?? null);
          }
          setLoading(false);
          setJobId(null);
        } else if (job.status === "failed") {
          setError(job.error || "Ошибка импорта");
          setLoading(false);
          setJobId(null);
        } else {
          setLoading(true);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Ошибка импорта");
        setLoading(false);
        setJobId(null);
      }
    };

    const interval = setInterval(() => {
      void poll();
    }, 1500);
    void poll();
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobId, jobMode]);

  return (
    <div className="space-y-4" data-testid="office-billing-import-excel-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Импорт платежей (Excel)</h1>
        <p className="text-sm text-zinc-600">Загрузите XLSX файл для проверки данных.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-semibold text-zinc-700">
          XLSX файл
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleUpload}
            className="mt-2 block w-full text-sm"
            data-testid="office-billing-import-excel-upload"
          />
        </label>
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
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runImport("preview")}
            disabled={!file || loading}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F] disabled:opacity-50"
            data-testid="office-billing-import-excel-preview"
          >
            {loading ? "Обработка..." : "Предпросмотр"}
          </button>
          <button
            type="button"
            onClick={() => runImport("apply")}
            disabled={!file || loading}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
            data-testid="office-billing-import-excel-submit"
          >
            Импортировать
          </button>
          <a
            href="/office/jobs"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F]"
          >
            Задания
          </a>
        </div>
      </div>

      {loading ? <OfficeLoadingState message="Обрабатываем XLSX..." /> : null}
      {error ? <OfficeErrorState message={error} /> : null}

      {preview ? (
        <ImportResultCard title="Предпросмотр" result={preview} testId="office-billing-import-excel-preview-result" />
      ) : !loading && !error ? (
        <OfficeEmptyState message="Загрузите XLSX файл, чтобы увидеть предпросмотр." />
      ) : null}

      {result ? (
        <ImportResultCard title="Результат импорта" result={result} testId="office-billing-import-excel-result" />
      ) : null}
    </div>
  );
}

function ImportResultCard({
  title,
  result,
  testId,
}: {
  title: string;
  result: ImportResult;
  testId: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid={testId}>
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <div className="mt-2 grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
        <div>Всего строк: {result.totals.total}</div>
        <div>Валидных: {result.totals.valid}</div>
        <div>Ошибок: {result.totals.invalid}</div>
      </div>
      {result.errors.length === 0 ? (
        <div className="mt-3 text-sm text-emerald-700">Ошибок не найдено.</div>
      ) : (
        <div className="mt-3 space-y-2 text-sm text-rose-700">
          {result.errors.map((err) => (
            <div key={`${err.rowIndex}-${err.message}`}>
              Строка {err.rowIndex}: {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
