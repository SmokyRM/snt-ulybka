"use client";

import { useEffect, useState } from "react";
import { readOk } from "@/lib/api/client";
import OfficeLoadingState from "../../../_components/OfficeLoadingState";
import OfficeErrorState from "../../../_components/OfficeErrorState";
import OfficeEmptyState from "../../../_components/OfficeEmptyState";

type StatementTotals = {
  total: number;
  imported: number;
  matched: number;
  ambiguous: number;
  unmatched: number;
  duplicates: number;
  skippedOut: number;
};

type StatementError = { rowIndex: number; message: string };

type StatementResult = { totals: StatementTotals; errors: StatementError[] };

type OfficeJob = {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  resultData?: StatementResult | null;
  error?: string | null;
};

export default function StatementImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatementResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setResult(null);
    setError(null);
  };

  const startImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/office/billing/import/statement", {
        method: "POST",
        body: formData,
      });
      const data = await readOk<{ jobId: string }>(response);
      setJobId(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка запуска импорта");
      setLoading(false);
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
          setResult(job.resultData ?? null);
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
  }, [jobId]);

  return (
    <div className="space-y-4" data-testid="office-import-statement-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Импорт банковской выписки</h1>
        <p className="text-sm text-zinc-600">Загрузите CSV или XLSX файл выписки для обработки.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-semibold text-zinc-700">
          Файл выписки
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleUpload}
            className="mt-2 block w-full text-sm"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startImport}
            disabled={!file || loading}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
            data-testid="office-import-statement-submit"
          >
            {loading ? "Обрабатываем..." : "Запустить импорт"}
          </button>
          <a
            href="/office/jobs"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F]"
          >
            Задания
          </a>
        </div>
      </div>

      {loading ? <OfficeLoadingState message="Обрабатываем выписку..." /> : null}
      {error ? <OfficeErrorState message={error} /> : null}

      {result ? (
        <ResultCard result={result} />
      ) : !loading && !error ? (
        <OfficeEmptyState message="Загрузите файл выписки, чтобы увидеть результат." />
      ) : null}
    </div>
  );
}

function ResultCard({ result }: { result: StatementResult }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-import-statement-result">
      <div className="text-sm font-semibold text-zinc-900">Результат</div>
      <div className="mt-2 grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
        <div>Всего строк: {result.totals.total}</div>
        <div>Импортировано: {result.totals.imported}</div>
        <div>Дубликаты: {result.totals.duplicates}</div>
        <div>Сопоставлено: {result.totals.matched}</div>
        <div>Неоднозначно: {result.totals.ambiguous}</div>
        <div>Не найдено: {result.totals.unmatched}</div>
        <div>Пропущено (расход): {result.totals.skippedOut}</div>
      </div>
      {result.errors.length === 0 ? (
        <div className="mt-3 text-sm text-emerald-700">Ошибок в файле не найдено.</div>
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
