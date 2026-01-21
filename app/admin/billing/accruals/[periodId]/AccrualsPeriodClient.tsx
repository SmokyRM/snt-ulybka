"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { isApiOk, parseApiJson, readOk } from "@/lib/api/client";

type PlotRow = { plotId: string; plotNumber: string; ownerName: string; membership: number; target: number };
type ByType = { membership: { count: number; accrued: number; paid: number }; target: { count: number; accrued: number; paid: number } };
type Period = { id: string; from: string; to: string; title?: string | null; status: string };

type PeriodData = {
  period: Period;
  summary: { plotCount: number; totalAccrued: number; totalPaid: number; needsReviewCount: number };
  byType: ByType;
  plotRows: PlotRow[];
};

type PreviewRow = { plotId: string; plotNumber: string; ownerName: string; membershipAmount: number; targetAmount: number; total: number };
type SkippedItem = { plotId?: string; plotNumber?: string; reason: string };

export default function AccrualsPeriodClient({ periodId }: { periodId: string }) {
  const [data, setData] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewSkipped, setPreviewSkipped] = useState<SkippedItem[]>([]);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyForce, setApplyForce] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/billing/accruals/period/${periodId}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await readOk<PeriodData>(r);
        return data;
      })
      .then(setData)
      .catch((e) => {
        setError((e as Error).message);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [periodId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewRows([]);
    setPreviewSkipped([]);
    try {
      const res = await fetch("/api/admin/billing/accruals/generate/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId }),
      });
      const data = await readOk<{ rows?: PreviewRow[]; skipped?: SkippedItem[] }>(res);
      setPreviewRows(data.rows ?? []);
      setPreviewSkipped(data.skipped ?? []);
      setPreviewOpen(true);
    } catch (e) {
      setPreviewSkipped([{ reason: (e as Error).message }]);
      setPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    setApplyError(null);
    setApplyLoading(true);
    try {
      const res = await fetch("/api/admin/billing/accruals/generate/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, force: applyForce }),
      });
      if (res.status === 409) {
        const payload = await parseApiJson(res);
        const msg = !isApiOk(payload) ? payload.error.message : null;
        setApplyError(msg || "Уже есть начисления. Включите «Перезаписать» и нажмите снова.");
        return;
      }
      await readOk<{ created?: number; code?: string }>(res);
      setApplyError(null);
      setApplyForce(false);
      load();
    } catch (e) {
      setApplyError((e as Error).message || "Ошибка применения начислений");
    } finally {
      setApplyLoading(false);
    }
  };

  const formatAmount = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";

  if (loading && !data) {
    return <div className="py-8 text-center text-zinc-600">Загрузка…</div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900">
        {error || "Нет данных"}
        <Link href="/admin/billing/accruals" className="ml-2 text-[#5E704F] hover:underline">
          К списку
        </Link>
      </div>
    );
  }

  const canGenerate = data.period.status === "draft" || data.period.status === "approved";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <button
          type="button"
          data-testid="accruals-generate-preview"
          onClick={handlePreview}
          disabled={previewLoading || !canGenerate}
          className="rounded-full border border-zinc-400 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          {previewLoading ? "…" : "Предпросмотр генерации"}
        </button>
        <button
          type="button"
          data-testid="accruals-generate-apply"
          onClick={handleApply}
          disabled={applyLoading || !canGenerate}
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41] disabled:opacity-50"
        >
          {applyLoading ? "…" : "Применить генерацию"}
        </button>
        {data.summary.plotCount > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={applyForce}
              onChange={(e) => setApplyForce(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Перезаписать при наличии начислений
          </label>
        )}
        <a
          href={`/api/admin/billing/accruals/period/${periodId}/export`}
          data-testid="accruals-export-csv"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          download
        >
          Экспорт CSV
        </a>
        <Link
          href="/admin/billing/accruals"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          К списку
        </Link>
      </div>

      {applyError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          {applyError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm text-blue-700">Членские (membership)</div>
          <div className="text-xl font-semibold text-blue-900">{formatAmount(data.byType.membership.accrued)}</div>
          <div className="text-xs text-blue-600">оплачено: {formatAmount(data.byType.membership.paid)}</div>
        </div>
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
          <div className="text-sm text-purple-700">Целевые (target)</div>
          <div className="text-xl font-semibold text-purple-900">{formatAmount(data.byType.target.accrued)}</div>
          <div className="text-xs text-purple-600">оплачено: {formatAmount(data.byType.target.paid)}</div>
        </div>
      </div>

      {data.plotRows.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-zinc-700">Участок</th>
                <th className="px-4 py-2 text-left font-semibold text-zinc-700">Владелец</th>
                <th className="px-4 py-2 text-right font-semibold text-zinc-700">Членские</th>
                <th className="px-4 py-2 text-right font-semibold text-zinc-700">Целевые</th>
                <th className="px-4 py-2 text-right font-semibold text-zinc-700">Всего</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.plotRows.map((r) => (
                <tr key={r.plotId} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 text-zinc-800">{r.plotNumber}</td>
                  <td className="px-4 py-2 text-zinc-600">{r.ownerName}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{formatAmount(r.membership)}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{formatAmount(r.target)}</td>
                  <td className="px-4 py-2 text-right font-medium text-zinc-900">{formatAmount(r.membership + r.target)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
          Нет начислений. Нажмите «Предпросмотр», затем «Применить генерацию».
        </div>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-lg">
            <div className="sticky top-0 border-b border-zinc-200 bg-white px-4 py-3 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-zinc-900">Предпросмотр генерации</h3>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded border border-zinc-300 px-3 py-1 text-sm font-medium hover:bg-zinc-100"
              >
                Закрыть
              </button>
            </div>
            <div className="p-4 space-y-4">
              {previewSkipped.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-800">Пропущено / предупреждения</h4>
                  <ul className="mt-1 list-inside list-disc text-sm text-zinc-700">
                    {previewSkipped.map((s, i) => (
                      <li key={i}>{s.plotNumber ? `${s.plotNumber}: ` : ""}{s.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              {previewRows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-2 py-1 text-left font-semibold">Участок</th>
                        <th className="px-2 py-1 text-left font-semibold">Владелец</th>
                        <th className="px-2 py-1 text-right font-semibold">Членские</th>
                        <th className="px-2 py-1 text-right font-semibold">Целевые</th>
                        <th className="px-2 py-1 text-right font-semibold">Всего</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {previewRows.map((r) => (
                        <tr key={r.plotId}>
                          <td className="px-2 py-1">{r.plotNumber}</td>
                          <td className="px-2 py-1">{r.ownerName}</td>
                          <td className="px-2 py-1 text-right">{formatAmount(r.membershipAmount)}</td>
                          <td className="px-2 py-1 text-right">{formatAmount(r.targetAmount)}</td>
                          <td className="px-2 py-1 text-right font-medium">{formatAmount(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
