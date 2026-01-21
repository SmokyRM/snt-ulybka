"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UnifiedBillingPeriod } from "@/types/snt";
import { readOk } from "@/lib/api/client";

interface PeriodDetailClientProps {
  periodId: string;
  initialPeriod: UnifiedBillingPeriod;
}

type AccrualData = {
  id: string;
  plotId: string;
  type: "membership" | "target" | "electric";
  amountAccrued: number;
  amountPaid: number;
  debt: number;
  plot: {
    id: string;
    plotNumber: string;
    street: string;
    ownerFullName: string | null;
  } | null;
};

type PeriodDetailData = {
  period: UnifiedBillingPeriod;
  accruals: AccrualData[];
  totals: { accrued: number; paid: number; debt: number };
  totalsByType: {
    membership: { accrued: number; paid: number; debt: number };
    target: { accrued: number; paid: number; debt: number };
    electric: { accrued: number; paid: number; debt: number };
  };
};

export default function PeriodDetailClient({ periodId, initialPeriod }: PeriodDetailClientProps) {
  const router = useRouter();
  const [data, setData] = useState<PeriodDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, [periodId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/billing/periods/${periodId}`, { cache: "no-store" });
      const json = await readOk<PeriodDetailData>(res);
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (types: Array<"membership" | "target" | "electric">) => {
    if (data?.period.status !== "draft") {
      setError("Генерация доступна только для периодов в статусе 'Черновик'");
      return;
    }

    setGenerating(true);
    setError(null);
    setGenerateMessage(null);
    try {
      const res = await fetch(`/api/admin/billing/periods/${periodId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types }),
      });

      const data = await readOk<{ generated?: number; skipped?: number }>(res);
      setGenerateMessage(
        `Сгенерировано: ${data.generated || 0}, пропущено (уже существуют): ${data.skipped || 0}`
      );
      await loadData();
      setTimeout(() => setGenerateMessage(null), 5000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCsv = () => {
    window.open(`/api/admin/billing/periods/${periodId}/export.csv`, "_blank");
  };

  const handleExportXlsx = async () => {
    if (!data) return;
    try {
      const { buildXlsxFromJson, downloadXlsx } = await import("@/lib/excel");

      const jsonData = data.accruals.map((a) => ({
        Улица: a.plot?.street || "",
        Участок: a.plot?.plotNumber || "",
        Владелец: a.plot?.ownerFullName || "",
        Тип: a.type === "membership" ? "Членские" : a.type === "target" ? "Целевые" : "Электроэнергия",
        Начислено: a.amountAccrued,
        Оплачено: a.amountPaid,
        Долг: a.debt,
      }));

      const buffer = await buildXlsxFromJson(jsonData, "Начисления");
      downloadXlsx(buffer, `period-${periodId}.xlsx`);
    } catch (e) {
      setError("Ошибка экспорта XLSX: " + (e as Error).message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  if (error && !data) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (!data) return null;

  const formatAmount = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Период: {new Date(data.period.from).toLocaleDateString("ru-RU")} —{" "}
            {new Date(data.period.to).toLocaleDateString("ru-RU")}
          </h1>
          {data.period.title && <p className="text-sm text-zinc-600 mt-1">{data.period.title}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Экспорт CSV
          </button>
          <button
            type="button"
            onClick={handleExportXlsx}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Экспорт XLSX
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span
          className={`inline-flex rounded px-3 py-1 text-sm font-medium ${
            data.period.status === "draft"
              ? "bg-yellow-100 text-yellow-800"
              : data.period.status === "approved"
                ? "bg-green-100 text-green-800"
                : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {data.period.status === "draft"
            ? "Черновик"
            : data.period.status === "approved"
              ? "Утверждён"
              : "Закрыт"}
        </span>
        {data.period.status === "draft" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleGenerate(["membership"])}
              disabled={generating}
              className="rounded bg-[#5E704F] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
            >
              {generating ? "Генерация..." : "Сгенерировать членские"}
            </button>
            <button
              type="button"
              onClick={() => handleGenerate(["target"])}
              disabled={generating}
              className="rounded bg-[#5E704F] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
            >
              {generating ? "Генерация..." : "Сгенерировать целевые"}
            </button>
            <button
              type="button"
              onClick={() => handleGenerate(["membership", "target"])}
              disabled={generating}
              className="rounded bg-[#5E704F] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
            >
              {generating ? "Генерация..." : "Сгенерировать все"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {generateMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="alert">
          {generateMessage}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-zinc-600">Начислено</div>
          <div className="text-2xl font-semibold text-zinc-900">{formatAmount(data.totals.accrued)} ₽</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-zinc-600">Оплачено</div>
          <div className="text-2xl font-semibold text-zinc-900">{formatAmount(data.totals.paid)} ₽</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-zinc-600">Долг</div>
          <div className="text-2xl font-semibold text-zinc-900">{formatAmount(data.totals.debt)} ₽</div>
        </div>
      </div>

      {/* By Type */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900 mb-2">Членские</div>
          <div className="text-xs text-zinc-600 space-y-1">
            <div>Начислено: {formatAmount(data.totalsByType.membership.accrued)} ₽</div>
            <div>Оплачено: {formatAmount(data.totalsByType.membership.paid)} ₽</div>
            <div>Долг: {formatAmount(data.totalsByType.membership.debt)} ₽</div>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900 mb-2">Целевые</div>
          <div className="text-xs text-zinc-600 space-y-1">
            <div>Начислено: {formatAmount(data.totalsByType.target.accrued)} ₽</div>
            <div>Оплачено: {formatAmount(data.totalsByType.target.paid)} ₽</div>
            <div>Долг: {formatAmount(data.totalsByType.target.debt)} ₽</div>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900 mb-2">Электроэнергия</div>
          <div className="text-xs text-zinc-600 space-y-1">
            <div>Начислено: {formatAmount(data.totalsByType.electric.accrued)} ₽</div>
            <div>Оплачено: {formatAmount(data.totalsByType.electric.paid)} ₽</div>
            <div>Долг: {formatAmount(data.totalsByType.electric.debt)} ₽</div>
          </div>
        </div>
      </div>

      {/* Accruals Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Улица</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участок</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Владелец</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Тип</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Начислено</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Оплачено</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Долг</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {data.accruals.map((accrual) => (
              <tr key={accrual.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 text-zinc-700">{accrual.plot?.street || "—"}</td>
                <td className="px-4 py-3 text-zinc-700">{accrual.plot?.plotNumber || "—"}</td>
                <td className="px-4 py-3 text-zinc-700">{accrual.plot?.ownerFullName || "—"}</td>
                <td className="px-4 py-3 text-zinc-700">
                  {accrual.type === "membership"
                    ? "Членские"
                    : accrual.type === "target"
                      ? "Целевые"
                      : "Электроэнергия"}
                </td>
                <td className="px-4 py-3 text-right text-zinc-900">{formatAmount(accrual.amountAccrued)} ₽</td>
                <td className="px-4 py-3 text-right text-zinc-900">{formatAmount(accrual.amountPaid)} ₽</td>
                <td className="px-4 py-3 text-right text-zinc-900">{formatAmount(accrual.debt)} ₽</td>
              </tr>
            ))}
            {data.accruals.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Нет начислений. Сгенерируйте начисления для этого периода.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
