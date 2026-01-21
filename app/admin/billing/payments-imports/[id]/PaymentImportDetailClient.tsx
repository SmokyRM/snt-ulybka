"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PaymentImport, PaymentImportRow } from "@/types/snt";
import { apiGetRaw, readOk } from "@/lib/api/client";

type ImportDetailResponse = {
  import: PaymentImport & {
    createdByName: string;
    appliedByName?: string | null;
  };
  rows: Array<
    PaymentImportRow & {
      plot?: {
        id: string;
        plotNumber: string;
        street: string;
        ownerFullName: string | null;
      } | null;
    }
  >;
  stats: {
    total: number;
    matched: number;
    unmatched: number;
    withErrors: number;
    applied: number;
  };
  auditLogs: Array<{
    id: string;
    action: string;
    actorName: string;
    actorRole: string | null;
    createdAt: string;
    before: unknown;
    after: unknown;
  }>;
};

export default function PaymentImportDetailClient({ importId }: { importId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ImportDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, [importId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/billing/payments-imports/${importId}`, { cache: "no-store" });
      const payload = await readOk<ImportDetailResponse>(res);
      setData(payload);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!data || data.import.status !== "draft") return;

    setApplying(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/billing/payments-import/${importId}/apply`, {
        method: "POST",
      });

      const data = await readOk<{ applied?: number }>(res);
      setMessage(`Импорт применён. Создано платежей: ${data.applied || 0}`);
      void loadData();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  const handleMatch = async (rowId: string, plotId: string) => {
    try {
      const res = await fetch(`/api/admin/billing/payments-import/${importId}/match`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowId, plotId }),
      });

      await readOk(res);

      void loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleExportErrors = () => {
    window.open(`/api/admin/billing/payments-import/${importId}/export-errors`, "_blank");
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

  if (loading) {
    return <div className="text-center py-8 text-zinc-600">Загрузка...</div>;
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
        {error || "Импорт не найден"}
      </div>
    );
  }

  const { import: imp, rows, stats, auditLogs } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/billing/payments-imports"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Назад к журналу
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Импорт: {imp.fileName}</h1>
        </div>
        <div className="flex gap-3">
          {imp.status === "draft" && (
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || stats.withErrors > 0}
              className="rounded-full bg-[#5E704F] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {applying ? "Применение..." : "Применить импорт"}
            </button>
          )}
          {(stats.unmatched > 0 || stats.withErrors > 0) && (
            <button
              type="button"
              onClick={handleExportErrors}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Экспорт ошибок (CSV)
            </button>
          )}
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

      {/* Info Card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-zinc-600">Статус</div>
          <div className="mt-1 text-lg font-semibold text-zinc-900">
            {imp.status === "draft" ? "Черновик" : imp.status === "applied" ? "Применён" : "Отменён"}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-zinc-600">Создан</div>
          <div className="mt-1 text-sm font-semibold text-zinc-900">{formatDate(imp.createdAt)}</div>
          <div className="text-xs text-zinc-500">{imp.createdByName}</div>
        </div>
        {imp.appliedAt && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-zinc-600">Применён</div>
            <div className="mt-1 text-sm font-semibold text-zinc-900">{formatDate(imp.appliedAt)}</div>
            <div className="text-xs text-zinc-500">{imp.appliedByName || "—"}</div>
          </div>
        )}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-zinc-600">Всего строк</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-900">{stats.total}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="text-sm text-green-700">Совпало</div>
          <div className="text-2xl font-semibold text-green-900">{stats.matched}</div>
        </div>
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <div className="text-sm text-yellow-700">Не совпало</div>
          <div className="text-2xl font-semibold text-yellow-900">{stats.unmatched}</div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="text-sm text-red-700">С ошибками</div>
          <div className="text-2xl font-semibold text-red-900">{stats.withErrors}</div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="text-sm text-blue-700">Применено</div>
          <div className="text-2xl font-semibold text-blue-900">{stats.applied}</div>
        </div>
      </div>

      {/* Rows Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">Строки импорта</h2>
        </div>
        <div className="overflow-x-auto">
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
              {rows.map((row) => {
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
                        <div className="text-xs text-red-600">{row.validationErrors?.join(", ")}</div>
                      )}
                      {isUnmatched && imp.status === "draft" && (
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

      {/* Audit Log */}
      {auditLogs.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-zinc-200">
            <h2 className="text-lg font-semibold text-zinc-900">История изменений</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-zinc-900">{log.action}</div>
                    <div className="text-xs text-zinc-500">
                      {log.actorName} {log.actorRole ? `(${log.actorRole})` : ""} • {formatDate(log.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
