"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet, readOk } from "@/lib/api/client";

type Plot = { id: string; plotNumber: string; street: string; ownerFullName?: string | null };
type Row = {
  id: string;
  rowIndex: number;
  date: string;
  amount: number;
  purpose?: string | null;
  fullName?: string | null;
  plotNumber?: string | null;
  matchedPlotId?: string | null;
  matchType?: string | null;
  validationErrors?: string[] | null;
  plot?: { id: string; plotNumber: string; street: string; ownerFullName?: string | null } | null;
};

type Res = {
  import: {
    id: string;
    fileName: string;
    status: string;
    createdAt?: string;
    createdByName?: string;
    appliedRows?: number;
    unmatchedRows?: number;
    errorRows?: number;
  };
  rows: Row[];
  stats: { total: number; matched: number; unmatched: number; withErrors: number; applied: number };
};

function isNeedsReview(r: Row): boolean {
  return !(r.validationErrors && r.validationErrors.length) && !r.matchedPlotId;
}
function isError(r: Row): boolean {
  return !!(r.validationErrors && r.validationErrors.length);
}

export default function ImportDetailClient({ importId }: { importId: string }) {
  const [data, setData] = useState<Res | null>(null);
  const [loading, setLoading] = useState(true);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [r, plotsData] = await Promise.all([
        fetch(`/api/admin/billing/payments/imports/${importId}`, { cache: "no-store" }),
        apiGet<{ plots?: Plot[] }>(`/api/admin/registry/plots?limit=800`, { cache: "no-store" }),
      ]);
      try {
        const data = await readOk<Res>(r);
        setData(data);
      } catch (error) {
        setErr(error instanceof Error ? error.message : "Не удалось загрузить импорт");
      }
      setPlots(plotsData.plots || []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [importId]);

  const resolve = async (rowId: string, plotId: string) => {
    if (!plotId) return;
    setSaving(rowId);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/billing/payments/imports/${importId}/match`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowId, plotId }),
      });
      await readOk(res);
      void load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const formatAmount = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <div className="py-8 text-center text-zinc-600">Загрузка…</div>;
  if (!data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
        {err || "Импорт не найден"}
      </div>
    );
  }

  const { import: imp, rows } = data;
  const problematic = rows.filter((r) => isNeedsReview(r) || isError(r));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/billing/payments/imports" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Журнал импортов
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Импорт: {imp.fileName}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {imp.createdAt && formatDate(imp.createdAt)}
          {imp.createdByName && <> • {imp.createdByName}</>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2">
          <span className="text-sm text-green-700">imported</span>
          <div className="text-lg font-semibold text-green-900">{imp.appliedRows ?? data.stats.applied}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
          <span className="text-sm text-amber-700">needs_review</span>
          <div className="text-lg font-semibold text-amber-900">{imp.unmatchedRows ?? data.stats.unmatched}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2">
          <span className="text-sm text-red-700">errors</span>
          <div className="text-lg font-semibold text-red-900">{imp.errorRows ?? data.stats.withErrors}</div>
        </div>
        {(data.stats.withErrors ?? imp.errorRows ?? 0) > 0 && (
          <a
            href={`/api/admin/billing/payments/imports/${importId}/export-errors`}
            data-testid="payments-import-errors-export"
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            download
          >
            Скачать ошибки.csv
          </a>
        )}
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {err}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <h2 className="border-b border-zinc-200 px-4 py-3 text-lg font-semibold text-zinc-900">
          Проблемные строки (needs_review и errors)
        </h2>
        {problematic.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-500">Нет проблемных строк.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">date</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-700">amount</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">plotNo / payer</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">status</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">разрешить</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {problematic.map((row) => {
                  const need = isNeedsReview(row);
                  const errRow = isError(row);
                  return (
                    <tr
                      key={row.id}
                      className={errRow ? "bg-red-50" : "bg-amber-50"}
                    >
                      <td className="px-3 py-2 text-zinc-700">{row.rowIndex}</td>
                      <td className="px-3 py-2 text-zinc-800">{row.date || "—"}</td>
                      <td className="px-3 py-2 text-right font-medium text-zinc-900">{formatAmount(row.amount)}</td>
                      <td className="px-3 py-2 text-zinc-700">
                        {row.plotNumber || "—"} {row.fullName ? ` / ${row.fullName}` : ""}
                      </td>
                      <td className="px-3 py-2">
                        <span className={errRow ? "text-red-700 font-medium" : "text-amber-700"}>
                          {errRow ? "error" : "needs_review"}
                        </span>
                        {errRow && row.validationErrors?.length ? (
                          <div className="mt-0.5 text-xs text-red-600">{row.validationErrors.join("; ")}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {need ? (
                          <ResolveSelect
                            plots={plots}
                            onSelect={(plotId) => resolve(row.id, plotId)}
                            saving={saving === row.id}
                          />
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ResolveSelect({
  plots,
  onSelect,
  saving,
}: {
  plots: Plot[];
  onSelect: (plotId: string) => void;
  saving: boolean;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="flex items-center gap-2">
      <select
        value={val}
        onChange={(e) => {
          const v = e.target.value;
          setVal(v);
          if (v) onSelect(v);
        }}
        disabled={saving}
        className="min-w-[180px] rounded border border-zinc-300 px-2 py-1.5 text-sm disabled:opacity-60"
      >
        <option value="">— участок —</option>
        {plots.map((p) => (
          <option key={p.id} value={p.id}>
            {p.street}, уч. {p.plotNumber}
          </option>
        ))}
      </select>
      {saving && <span className="text-xs text-zinc-500">…</span>}
    </div>
  );
}
