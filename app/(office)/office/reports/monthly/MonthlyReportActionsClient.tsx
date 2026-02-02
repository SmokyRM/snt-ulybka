"use client";

import { useEffect, useState } from "react";
import { apiPost, apiGet } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";

type OfficeJob = {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  resultData?: {
    links?: Array<{ period: string; url: string }>;
  } | null;
  error?: string | null;
};

export default function MonthlyReportActionsClient({ period }: { period: string }) {
  const [from, setFrom] = useState(period);
  const [to, setTo] = useState(period);
  const [jobId, setJobId] = useState<string | null>(null);
  const [links, setLinks] = useState<Array<{ period: string; url: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const poll = async () => {
      try {
        const data = await apiGet<{ job: OfficeJob }>(`/api/office/jobs/${jobId}`);
        if (!active) return;
        const job = data.job;
        if (job.status === "done") {
          setLinks(job.resultData?.links ?? []);
          setLoading(false);
          setJobId(null);
        } else if (job.status === "failed") {
          setError(job.error || "Ошибка генерации PDF");
          setLoading(false);
          setJobId(null);
        } else {
          setLoading(true);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Ошибка генерации PDF");
        setLoading(false);
        setJobId(null);
      }
    };

    const interval = setInterval(() => void poll(), 1500);
    void poll();
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobId]);

  const handleBatch = async () => {
    setLoading(true);
    setError(null);
    setLinks([]);
    try {
      const periods: string[] = [];
      if (from && to) {
        const [fy, fm] = from.split("-").map(Number);
        const [ty, tm] = to.split("-").map(Number);
        if (Number.isFinite(fy) && Number.isFinite(fm) && Number.isFinite(ty) && Number.isFinite(tm)) {
          let cursor = new Date(Date.UTC(fy, fm - 1, 1));
          const end = new Date(Date.UTC(ty, tm - 1, 1));
          if (cursor > end) {
            const tmp = cursor;
            cursor = end;
            end.setTime(tmp.getTime());
          }
          while (cursor <= end) {
            periods.push(cursor.toISOString().slice(0, 7));
            cursor.setUTCMonth(cursor.getUTCMonth() + 1);
          }
        }
      }
      const result = await apiPost<{ jobId: string }>("/api/office/jobs", {
        type: "reports.monthlyPdfBatch",
        payload: { periods },
      });
      setJobId(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации PDF");
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    setSingleLoading(true);
    setSingleError(null);
    setDocUrl(null);
    setDocId(null);
    try {
      // raw endpoint (pdf download)
      const res = await fetch(`/api/office/reports/monthly.pdf?period=${period}`);
      if (!res.ok) {
        setSingleError("Не удалось сформировать PDF");
        setSingleLoading(false);
        return;
      }
      const headerDocUrl = res.headers.get("x-office-doc-url");
      const headerDocId = res.headers.get("x-office-doc-id");
      setDocUrl(headerDocUrl);
      setDocId(headerDocId);
      await res.blob();
      setSingleLoading(false);
    } catch (err) {
      setSingleError(err instanceof Error ? err.message : "Ошибка генерации PDF");
      setSingleLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-zinc-800">Период отчёта</label>
          <input
            type="month"
            value={period}
            readOnly
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
          />
        </div>
        <button
          type="button"
          onClick={handleGeneratePdf}
          disabled={singleLoading}
          className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
          data-testid="office-monthly-report-pdf"
        >
          Сгенерировать PDF
        </button>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-600">С</label>
            <input
              type="month"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-600">По</label>
            <input
              type="month"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
          <button
            type="button"
            onClick={handleBatch}
            disabled={loading}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F] disabled:opacity-50"
          >
            Сгенерировать PDF пачкой
          </button>
        </div>
      </div>

      {loading && <OfficeLoadingState message="Генерируем PDF..." testId="office-monthly-report-loading" />}
      {error && <OfficeErrorState message={error} onRetry={handleBatch} testId="office-monthly-report-error" />}
      {singleLoading && (
        <OfficeLoadingState message="Формируем PDF отчёт..." testId="office-monthly-report-single-loading" />
      )}
      {singleError && (
        <OfficeErrorState message={singleError} onRetry={handleGeneratePdf} testId="office-monthly-report-single-error" />
      )}

      {docUrl && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-emerald-900">
          <div className="font-semibold">PDF сохранён в реестре документов.</div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
            <a href={docUrl} className="font-semibold text-emerald-700" target="_blank" rel="noreferrer">
              Открыть файл
            </a>
            <a
              href={docId ? `/office/docs?docId=${docId}` : "/office/docs"}
              className="font-semibold text-emerald-700"
            >
              Перейти в документы
            </a>
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-4 space-y-2 text-sm text-zinc-700">
          {links.map((link) => (
            <div key={link.period} className="flex items-center justify-between">
              <span>{link.period}</span>
              <a href={link.url} className="text-xs font-semibold text-[#5E704F]" target="_blank" rel="noreferrer">
                Открыть PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
