"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";
import AppLink from "@/components/AppLink";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";

type ReceiptData = {
  id: string;
  plotId: string;
  plotLabel: string;
  residentName: string;
  debt: number;
  period: string;
  generatedAt: string;
};

type ReceiptsResponse = {
  receipts: ReceiptData[];
  summary: {
    count: number;
    totalDebt: number;
    period: string;
  };
};

type OfficeJob = {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  resultData?: {
    links?: Array<{ plotId?: string; plotLabel?: string; residentName?: string; url: string }>;
  } | null;
  error?: string | null;
};

type BatchLink = { plotId?: string; plotLabel?: string; residentName?: string; url: string };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default function ReceiptsClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReceiptsResponse | null>(null);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [minDebt, setMinDebt] = useState(0);
  const [pdfFilter, setPdfFilter] = useState<"all" | "debtors" | "has_accruals">("debtors");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLinks, setBatchLinks] = useState<BatchLink[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);

  const loadReceipts = async () => {
    setLoading(true);
    setError(null);
    setBatchLinks([]);
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      params.set("minDebt", String(minDebt));
      const result = await apiGet<ReceiptsResponse>(`/api/office/billing/receipts?${params.toString()}`);
      setData(result);
      setSelectedIds(new Set(result.receipts.map((r) => r.plotId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [period, minDebt]);

  useEffect(() => {
    if (!jobId) return;
    let active = true;

    const poll = async () => {
      try {
        const data = await apiGet<{ job: OfficeJob }>(`/api/office/jobs/${jobId}`);
        if (!active) return;
        const job = data.job;
        if (job.status === "done") {
          setBatchLinks(job.resultData?.links ?? []);
          setLoading(false);
          setJobId(null);
        } else if (job.status === "failed") {
          setError(job.error || "Ошибка формирования пакета");
          setLoading(false);
          setJobId(null);
        } else {
          setLoading(true);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Ошибка проверки задания");
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

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!data) return;
    if (selectedIds.size === data.receipts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.receipts.map((r) => r.plotId)));
    }
  };

  const getPdfUrl = () => {
    const params = new URLSearchParams();
    params.set("period", period);
    params.set("minDebt", String(minDebt));
    if (selectedIds.size > 0 && data && selectedIds.size < data.receipts.length) {
      params.set("plotIds", Array.from(selectedIds).join(","));
    }
    return `/api/office/billing/receipts/pdf?${params.toString()}`;
  };

  const handleBatch = async () => {
    setLoading(true);
    setError(null);
    setBatchLinks([]);
    try {
      const payload: Record<string, unknown> = {
        period,
        minDebt,
      };
      if (selectedIds.size > 0 && data && selectedIds.size < data.receipts.length) {
        payload.plotIds = Array.from(selectedIds);
      }
      const result = await apiPost<{ jobId: string }>(`/api/office/jobs`, {
        type: "receipts.batch",
        payload,
      });
      setJobId(result.jobId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Ошибка формирования пакета";
      setError(message);
      setLoading(false);
    }
  };

  const handleBatchPdf = async () => {
    setLoading(true);
    setError(null);
    setBatchLinks([]);
    try {
      const payload: Record<string, unknown> = {
        period,
        filter: pdfFilter,
        limit: 500,
      };
      if (selectedIds.size > 0 && data && selectedIds.size < data.receipts.length) {
        payload.plotIds = Array.from(selectedIds);
      }
      const result = await apiPost<{ jobId: string }>(`/api/office/jobs`, {
        type: "receipts.batchPdf",
        payload,
      });
      setJobId(result.jobId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Ошибка генерации PDF";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="office-receipts-root">
      {/* Controls */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Период</label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
              data-testid="office-receipts-period"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Мин. долг</label>
            <input
              type="number"
              value={minDebt}
              onChange={(e) => setMinDebt(Number(e.target.value))}
              step="100"
              min="0"
              className="w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
              data-testid="office-receipts-min-debt"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Фильтр PDF</label>
            <select
              value={pdfFilter}
              onChange={(e) => setPdfFilter(e.target.value as typeof pdfFilter)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            >
              <option value="all">Все</option>
              <option value="debtors">Должники</option>
              <option value="has_accruals">Есть начисления</option>
            </select>
          </div>
          <button
            type="button"
            onClick={loadReceipts}
            disabled={loading}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:opacity-50"
            data-testid="office-receipts-refresh"
          >
            Обновить
          </button>
          {data && data.receipts.length > 0 && selectedIds.size > 0 && (
            <AppLink
              href={getPdfUrl()}
              target="_blank"
              className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
              data-testid="office-receipts-print"
            >
              Печать ({selectedIds.size})
            </AppLink>
          )}
          {data && data.receipts.length > 0 ? (
            <button
              type="button"
              onClick={() => void handleBatch()}
              disabled={loading}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:opacity-50"
              data-testid="office-receipts-batch-generate"
            >
              Пакет квитанций
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleBatchPdf()}
            disabled={loading}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
            data-testid="office-receipts-batch-pdf"
          >
            Сгенерировать пачку PDF
          </button>
          <AppLink
            href="/office/jobs"
            className="text-sm font-semibold text-[#5E704F] transition hover:underline"
          >
            Задания
          </AppLink>
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
            <span className="text-xs text-zinc-500">Квитанций:</span>{" "}
            <span className="font-semibold text-zinc-900">{data.summary.count}</span>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
            <span className="text-xs text-zinc-500">Общий долг:</span>{" "}
            <span className="font-semibold text-zinc-900">{formatCurrency(data.summary.totalDebt)}</span>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
            <span className="text-xs text-zinc-500">Выбрано:</span>{" "}
            <span className="font-semibold text-zinc-900">{selectedIds.size}</span>
          </div>
        </div>
      )}

      {/* States */}
      {loading && <OfficeLoadingState message="Загрузка квитанций..." testId="office-receipts-loading" />}
      {error && <OfficeErrorState message={error} onRetry={loadReceipts} testId="office-receipts-error" />}
      {jobId && (
        <div className="text-xs text-zinc-500" data-testid="office-receipts-job">
          Задание: {jobId}
        </div>
      )}

      {batchLinks.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Пакет PDF (ссылки)</div>
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            {batchLinks.map((link) => (
              <div key={link.plotId} className="flex items-center justify-between gap-3">
                <span>{link.plotLabel ? `${link.plotLabel} — ${link.residentName ?? ""}` : link.plotId}</span>
                <AppLink href={link.url} target="_blank" className="text-xs font-semibold text-[#5E704F]">
                  Открыть
                </AppLink>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && data && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {data.receipts.length === 0 ? (
            <OfficeEmptyState message="Нет должников для формирования квитанций." testId="office-receipts-empty" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === data.receipts.length}
                        onChange={toggleAll}
                        className="rounded border-zinc-300"
                        data-testid="office-receipts-select-all"
                      />
                    </th>
                    <th className="px-3 py-2 text-left">Участок</th>
                    <th className="px-3 py-2 text-left">Владелец</th>
                    <th className="px-3 py-2 text-right">Долг</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {data.receipts.map((receipt) => (
                    <tr key={receipt.id} data-testid={`office-receipts-row-${receipt.id}`}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(receipt.plotId)}
                          onChange={() => toggleSelection(receipt.plotId)}
                          className="rounded border-zinc-300"
                          data-testid={`office-receipts-select-${receipt.id}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-zinc-900">{receipt.plotLabel}</td>
                      <td className="px-3 py-2 text-zinc-700">{receipt.residentName}</td>
                      <td className="px-3 py-2 text-right font-semibold text-zinc-900">
                        {formatCurrency(receipt.debt)}
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
