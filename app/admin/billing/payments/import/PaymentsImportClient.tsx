"use client";

import { useState } from "react";
import Link from "next/link";
import { readOk } from "@/lib/api/client";

type PreviewRow = {
  rowNumber: number;
  rawLine: string;
  date: string;
  amount: number;
  plotNumber: string | null;
  ownerName: string | null;
  phone: string | null;
  comment: string | null;
  status: "ok" | "warning" | "error";
  errorMessage: string | null;
  matchedPlotId: string | null;
  matchType: string | null;
  periodId: string | null;
  potentialDuplicate: boolean;
};

type Preview = {
  previewRows: PreviewRow[];
  stats: { ok: number; warning: number; error: number };
  fileName: string;
};

export default function PaymentsImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setMessage(null);
      setPreview(null);
      setAppliedId(null);
    }
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
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/billing/payments/import/preview", { method: "POST", body: form });
      const data = await readOk<Preview>(res);
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
      const res = await fetch("/api/admin/billing/payments/import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.previewRows, fileName: preview.fileName }),
      });
      const data = await readOk<{ importId?: string; applied?: number }>(res);
      setMessage(`Применено: создано платежей ${data.applied ?? 0}. Импорт в журнале.`);
      setAppliedId(data.importId ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  const formatAmount = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6" data-testid="payments-import-root">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Загрузка CSV</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer" htmlFor="payments-import-file">
            <span className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
              Выбрать файл
            </span>
            <input
              id="payments-import-file"
              data-testid="payments-import-file"
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              className="hidden"
            />
          </label>
          {file && (
            <span className="text-sm text-zinc-600">
              {file.name} ({(file.size / 1024).toFixed(2)} КБ)
            </span>
          )}
          <button
            type="button"
            data-testid="payments-import-preview"
            onClick={handlePreview}
            disabled={loading || !file}
            className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Загрузка…" : "Предпросмотр"}
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
          {appliedId && (
            <Link href={`/admin/billing/payments/imports/${appliedId}`} className="ml-2 text-[#5E704F] font-medium hover:underline">
              Открыть импорт
            </Link>
          )}
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <span className="text-sm text-green-700">ok</span>
              <div className="text-xl font-semibold text-green-900">{preview.stats.ok}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="text-sm text-amber-700">warning</span>
              <div className="text-xl font-semibold text-amber-900">{preview.stats.warning}</div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <span className="text-sm text-red-700">error</span>
              <div className="text-xl font-semibold text-red-900">{preview.stats.error}</div>
            </div>
          </div>

          <button
            type="button"
            data-testid="payments-import-apply"
            onClick={handleApply}
            disabled={applying}
            className="rounded-full border-2 border-[#5E704F] bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41] disabled:opacity-50"
          >
            {applying ? "Применение…" : "Применить"}
          </button>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">date</th>
                    <th className="px-3 py-2 text-right font-semibold text-zinc-700">amount</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">plotNumber</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">ownerName</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">phone</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">comment</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">status / ошибки</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {preview.previewRows.map((r) => (
                    <tr
                      key={r.rowNumber}
                      className={
                        r.status === "error"
                          ? "bg-red-50"
                          : r.status === "warning"
                            ? "bg-amber-50"
                            : r.potentialDuplicate
                              ? "bg-orange-50"
                              : "bg-white"
                      }
                    >
                      <td className="px-3 py-2 text-zinc-600">{r.rowNumber}</td>
                      <td className="px-3 py-2 text-zinc-800">{r.date || "—"}</td>
                      <td className="px-3 py-2 text-right font-medium text-zinc-900">{formatAmount(r.amount)}</td>
                      <td className="px-3 py-2 text-zinc-700">{r.plotNumber || "—"}</td>
                      <td className="px-3 py-2 text-zinc-700">{r.ownerName || "—"}</td>
                      <td className="px-3 py-2 text-zinc-700">{r.phone || "—"}</td>
                      <td className="px-3 py-2 text-zinc-700">{r.comment || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={r.status === "error" ? "text-red-700 font-medium" : r.status === "warning" ? "text-amber-700" : "text-green-700"}>
                          {r.status}
                          {r.potentialDuplicate ? " (дубль?)" : ""}
                        </span>
                        {r.errorMessage && <div className="mt-0.5 text-xs text-red-600">{r.errorMessage}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
