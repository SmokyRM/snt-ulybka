"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentImport, PaymentImportRow } from "@/types/snt";
import { apiGetRaw, readOk } from "@/lib/api/client";

type PreviewResponse = {
  import: PaymentImport;
  rows: Array<{
    id: string;
    rowIndex: number;
    date: string;
    amount: number;
    purpose?: string | null;
    fullName?: string | null;
    phone?: string | null;
    plotNumber?: string | null;
    externalId?: string | null;
    matchedPlotId?: string | null;
    matchType?: "plot_number" | "phone" | "fullname" | "manual" | null;
    validationErrors?: string[] | null;
    plot?: {
      id: string;
      plotNumber: string;
      street: string;
      ownerFullName: string | null;
    } | null;
  }>;
  summary: {
    total: number;
    matched: number;
    unmatched: number;
    withErrors: number;
  };
};

export default function PaymentsImportNewClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setMessage(null);
      setPreview(null);
    }
  };

  const handleDownloadTemplate = () => {
    window.open("/api/admin/billing/payments-import/template", "_blank");
  };

  const handlePreview = async () => {
    if (!file) {
      setError("Выберите файл");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/billing/payments-import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await readOk<PreviewResponse>(res);
      setPreview(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;

    setApplying(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/billing/payments-import/${preview.import.id}/apply`, {
        method: "POST",
      });

      const data = await readOk<{ applied?: number }>(res);
      setMessage(`Импорт применён. Создано платежей: ${data.applied || 0}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  const handleMatch = async (rowId: string, plotId: string) => {
    if (!preview) return;

    try {
      const res = await fetch(`/api/admin/billing/payments-import/${preview.import.id}/match`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowId, plotId }),
      });

      await readOk(res);

      // Reload preview
      await handlePreview();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleExportErrors = () => {
    if (!preview) return;
    window.open(`/api/admin/billing/payments-import/${preview.import.id}/export-errors`, "_blank");
  };

  const formatAmount = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const matchTypeLabel = (type: "plot_number" | "phone" | "fullname" | "manual" | null | undefined) => {
    switch (type) {
      case "plot_number":
        return "По участку";
      case "phone":
        return "По телефону";
      case "fullname":
        return "По ФИО";
      case "manual":
        return "Вручную";
      default:
        return "—";
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Загрузка файла</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              📥 Скачать шаблон CSV
            </button>
          </div>
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
            onClick={handlePreview}
            disabled={loading || !file}
            className="rounded-full bg-[#5E704F] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {loading ? "Загрузка..." : "Предпросмотр"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="alert">
          {message}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-zinc-600">Всего строк</div>
              <div className="text-2xl font-semibold text-zinc-900">{preview.summary.total}</div>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
              <div className="text-sm text-green-700">Совпало</div>
              <div className="text-2xl font-semibold text-green-900">{preview.summary.matched}</div>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
              <div className="text-sm text-yellow-700">Не совпало</div>
              <div className="text-2xl font-semibold text-yellow-900">{preview.summary.unmatched}</div>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="text-sm text-red-700">С ошибками</div>
              <div className="text-2xl font-semibold text-red-900">{preview.summary.withErrors}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {preview.import.status === "draft" && (
              <button
                type="button"
                onClick={handleApply}
                disabled={applying || preview.summary.withErrors > 0}
                className="rounded-full bg-[#5E704F] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {applying ? "Применение..." : "Применить импорт"}
              </button>
            )}
            {preview.import.status === "applied" && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                Импорт применён
              </div>
            )}
            {(preview.summary.unmatched > 0 || preview.summary.withErrors > 0) && (
              <button
                type="button"
                onClick={handleExportErrors}
                className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
              >
                Экспорт ошибок (CSV)
              </button>
            )}
          </div>

          {/* Rows Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Строка</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Дата</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">Сумма</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Назначение</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">ФИО</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Телефон</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участок</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Совпадение</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {preview.rows.map((row) => {
                  const hasErrors = row.validationErrors && row.validationErrors.length > 0;
                  const isUnmatched = !row.matchedPlotId;
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-zinc-50 ${
                        hasErrors ? "bg-red-50" : isUnmatched ? "bg-yellow-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-zinc-700">{row.rowIndex}</td>
                      <td className="px-4 py-3 text-zinc-700">{row.date}</td>
                      <td className="px-4 py-3 text-right text-zinc-900">{formatAmount(row.amount)} ₽</td>
                      <td className="px-4 py-3 text-zinc-700">{row.purpose || "—"}</td>
                      <td className="px-4 py-3 text-zinc-700">{row.fullName || "—"}</td>
                      <td className="px-4 py-3 text-zinc-700">{row.phone || "—"}</td>
                      <td className="px-4 py-3 text-zinc-700">{row.plotNumber || "—"}</td>
                      <td className="px-4 py-3 text-zinc-700">
                        {row.plot ? (
                          <div>
                            <div className="font-medium text-green-700">
                              {row.plot.street}, уч. {row.plot.plotNumber}
                            </div>
                            <div className="text-xs text-zinc-500">{matchTypeLabel(row.matchType)}</div>
                          </div>
                        ) : (
                          <span className="text-yellow-700">Не найдено</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasErrors && (
                          <div className="text-xs text-red-600">
                            {row.validationErrors?.join(", ")}
                          </div>
                        )}
                        {isUnmatched && preview.import.status === "draft" && (
                          <MatchPlotButton rowId={row.id} onMatch={handleMatch} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchPlotButton({ rowId, onMatch }: { rowId: string; onMatch: (rowId: string, plotId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [plots, setPlots] = useState<Array<{ id: string; plotNumber: string; street: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState("");

  const loadPlots = async () => {
    setLoading(true);
    try {
      // Use plots API to get all plots
      const data = await apiGetRaw<{ plots?: Array<{ id: string; plotNumber: string; street: string }> }>(
        "/api/plots?limit=1000",
        { cache: "no-store" }
      );
      setPlots(data.plots || []);
    } catch (e) {
      console.error("Failed to load plots", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    void loadPlots();
  };

  const handleSave = () => {
    if (selectedPlotId) {
      onMatch(rowId, selectedPlotId);
      setOpen(false);
      setSelectedPlotId("");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="text-[#5E704F] hover:underline text-sm"
      >
        Привязать
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">Привязать к участку</h3>
        {loading ? (
          <div className="text-center py-4">Загрузка...</div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-zinc-800">Участок *</span>
              <select
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-2"
                required
              >
                <option value="">Выберите участок</option>
                {plots.map((plot) => (
                  <option key={plot.id} value={plot.id}>
                    {plot.street}, уч. {plot.plotNumber}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSelectedPlotId("");
                }}
                className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedPlotId}
                className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
              >
                Привязать
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
