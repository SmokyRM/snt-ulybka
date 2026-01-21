"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readOk } from "@/lib/api/client";

export default function PaymentsImportClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    jobId: string;
    summary: {
      totalRows: number;
      successCount: number;
      failedCount: number;
      createdPaymentsCount: number;
    };
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Выберите файл для загрузки");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/billing/import-payments", {
        method: "POST",
        body: formData,
      });

      const data = await readOk<{
        job?: { id: string };
        summary?: {
          totalRows: number;
          successCount: number;
          failedCount: number;
          createdPaymentsCount: number;
        };
      }>(res);

      if (data.job && data.summary) {
        setResult({
          jobId: data.job.id,
          summary: data.summary,
        });
        // Refresh router to update imports list
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message || "Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Загрузка файла</h2>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Выберите CSV файл</span>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded file:border-0 file:bg-[#5E704F] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#4d5d41]"
            />
            {file && (
              <p className="mt-2 text-sm text-zinc-600">
                Выбран файл: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)} КБ)
              </p>
            )}
          </label>

          <button
            type="button"
            onClick={handleUpload}
            disabled={loading || !file}
            className="rounded-full bg-[#5E704F] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {loading ? "Импорт..." : "Импортировать платежи"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            <p className="font-medium">Импорт завершен</p>
            <p className="mt-1">
              Всего строк: {result.summary.totalRows} | Успешно: {result.summary.successCount} | Ошибок:{" "}
              {result.summary.failedCount} | Создано платежей: {result.summary.createdPaymentsCount}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/admin/billing/imports"
              className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
            >
              Открыть журнал импортов
            </a>
            {result.summary.failedCount > 0 && (
              <a
                href={`/api/admin/billing/imports/${result.jobId}?format=csv`}
                className="rounded-full border border-amber-600 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
              >
                Скачать ошибки (CSV)
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
