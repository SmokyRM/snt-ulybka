"use client";

import { useEffect, useState } from "react";
import type { PaymentImportJob } from "@/lib/billing";
import { readOk } from "@/lib/api/client";

interface ImportJobWithErrors extends PaymentImportJob {
  errorsCount?: number;
}

export default function ImportsJournalClient() {
  const [jobs, setJobs] = useState<ImportJobWithErrors[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<{
    job: PaymentImportJob;
    errors: Array<{
      id: string;
      rowIndex: number;
      type: string;
      reason: string;
      rowData: Record<string, string | number | null>;
    }>;
  } | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/billing/imports", { cache: "no-store" });
      const { jobs } = await readOk<{ jobs: ImportJobWithErrors[] }>(res);
      setJobs(jobs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobDetails = async (jobId: string) => {
    if (selectedJob === jobId && jobDetails?.job.id === jobId) return; // Already loaded

    setError(null);
    try {
      const res = await fetch(`/api/admin/billing/imports/${jobId}`);
      const data = await readOk<{
        job: PaymentImportJob;
        errors: Array<{
          id: string;
          rowIndex: number;
          type: string;
          reason: string;
          rowData: Record<string, string | number | null>;
        }>;
      }>(res);
      setJobDetails(data);
      setSelectedJob(jobId);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatStatus = (status: PaymentImportJob["status"]) => {
    const statusMap = {
      processing: { label: "Обработка", className: "bg-blue-100 text-blue-800" },
      completed: { label: "Завершен", className: "bg-green-100 text-green-800" },
      failed: { label: "Ошибка", className: "bg-red-100 text-red-800" },
    };
    const statusInfo = statusMap[status];
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">
          Загрузка...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Файл</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Дата создания</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Статус</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-700">Всего строк</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-700">Успешно</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-700">Ошибок</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-700">Создано платежей</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-700">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{job.fileName}</td>
                      <td className="px-4 py-3 text-zinc-600">{formatDate(job.createdAt)}</td>
                      <td className="px-4 py-3">{formatStatus(job.status)}</td>
                      <td className="px-4 py-3 text-right text-zinc-900">{job.totalRows}</td>
                      <td className="px-4 py-3 text-right text-green-700">{job.successCount}</td>
                      <td className="px-4 py-3 text-right text-red-700">{job.failedCount}</td>
                      <td className="px-4 py-3 text-right text-zinc-900">{job.createdPaymentsCount}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => loadJobDetails(job.id)}
                            className="text-[#5E704F] hover:underline"
                          >
                            Детали
                          </button>
                          {job.failedCount > 0 && (
                            <a
                              href={`/api/admin/billing/imports/${job.id}?format=csv`}
                              className="text-amber-700 hover:underline"
                            >
                              Скачать ошибки
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                        Импорты не найдены. Загрузите первый файл на странице импорта.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Job Details */}
          {jobDetails && selectedJob && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Детали импорта: {jobDetails.job.fileName}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJob(null);
                    setJobDetails(null);
                  }}
                  className="text-zinc-600 hover:text-zinc-900"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-4 text-sm">
                <div>
                  <div className="text-xs text-zinc-600">Всего строк</div>
                  <div className="text-lg font-semibold text-zinc-900">{jobDetails.job.totalRows}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-600">Успешно</div>
                  <div className="text-lg font-semibold text-green-700">{jobDetails.job.successCount}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-600">Ошибок</div>
                  <div className="text-lg font-semibold text-red-700">{jobDetails.job.failedCount}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-600">Создано платежей</div>
                  <div className="text-lg font-semibold text-zinc-900">{jobDetails.job.createdPaymentsCount}</div>
                </div>
              </div>

              {jobDetails.errors.length > 0 && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900">Ошибки ({jobDetails.errors.length})</h3>
                    <a
                      href={`/api/admin/billing/imports/${jobDetails.job.id}?format=csv`}
                      className="text-sm text-amber-700 hover:underline"
                    >
                      Скачать CSV
                    </a>
                  </div>
                  <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200">
                    <table className="min-w-full divide-y divide-zinc-200 text-xs">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-zinc-700">Строка</th>
                          <th className="px-3 py-2 text-left font-semibold text-zinc-700">Тип</th>
                          <th className="px-3 py-2 text-left font-semibold text-zinc-700">Причина</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 bg-white">
                        {jobDetails.errors.map((err) => (
                          <tr key={err.id}>
                            <td className="px-3 py-2 text-zinc-600">{err.rowIndex}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
                                  err.type === "duplicate"
                                    ? "bg-amber-100 text-amber-800"
                                    : err.type === "unmatched"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {err.type === "duplicate" ? "Дубликат" : err.type === "unmatched" ? "Не сопоставлен" : "Ошибка"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-zinc-700">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
