"use client";

import { useEffect, useState } from "react";
import OfficeLoadingState from "../../../_components/OfficeLoadingState";
import OfficeErrorState from "../../../_components/OfficeErrorState";
import OfficeEmptyState from "../../../_components/OfficeEmptyState";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";

type PreviewRow = { plotId: string; plotLabel: string; amount: number; discount: number };

type PreviewResult = {
  totals: { count: number; totalAmount: number };
  rows: PreviewRow[];
};

export default function AccrualsGenerateClient() {
  const [period, setPeriod] = useState("2024-03");
  const [category, setCategory] = useState("membership");
  const [tariff, setTariff] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [scope, setScope] = useState<"all" | "filtered" | "selected">("all");
  const [plotQuery, setPlotQuery] = useState("");
  const [plotIdsRaw, setPlotIdsRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<{ createdCount: number; skippedCount: number; duplicates: string[] } | null>(null);
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [pendingAction, setPendingAction] = useState<"preview" | "generate" | null>(null);

  const payload = () => {
    const base = {
      period,
      category,
      tariff: tariff ? Number(tariff) : null,
      fixedAmount: fixedAmount ? Number(fixedAmount) : null,
      reason: showReason && reason.trim() ? reason.trim() : undefined,
    };
    if (!batchMode) {
      return base;
    }
    if (scope === "selected") {
      const plotIds = plotIdsRaw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      return { ...base, plotIds };
    }
    if (scope === "filtered") {
      return { ...base, plotQuery: plotQuery.trim() || null };
    }
    return base;
  };

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setPendingAction("preview");
    try {
      const data = await apiPost<PreviewResult>("/api/office/billing/accruals/preview", payload());
      setPreview(data);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "period_closed" || err.status === 409)) {
        setShowReason(true);
      }
      const message = err instanceof ApiError ? err.message : "Ошибка предпросмотра";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const runGenerate = async () => {
    setLoading(true);
    setError(null);
    setPendingAction("generate");
    try {
      const data = await apiPost<{ createdCount: number; skippedCount: number; duplicates: string[] }>(
        "/api/office/billing/accruals/generate",
        payload(),
      );
      setResult(data);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "period_closed" || err.status === 409)) {
        setShowReason(true);
      }
      const message = err instanceof ApiError ? err.message : "Ошибка генерации";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const data = await apiGet<{ status: "open" | "closed" }>(
          `/api/office/billing/period-close?period=${period}`,
        );
        if (!active) return;
        setShowReason(data.status === "closed");
      } catch {
        if (!active) return;
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, [period]);

  const retryWithReason = () => {
    if (pendingAction === "preview") {
      void runPreview();
    } else if (pendingAction === "generate") {
      void runGenerate();
    }
  };

  return (
    <div className="space-y-4" data-testid="office-accruals-generate-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Генерация начислений</h1>
        <p className="text-sm text-zinc-600">Сначала выполните предпросмотр, затем создайте начисления.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-zinc-700">
            Период (YYYY-MM)
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-zinc-700">
            Категория
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="membership">Членские</option>
              <option value="electricity">Электро</option>
              <option value="target">Целевые</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-zinc-700">
            Тариф (необязательно)
            <input
              value={tariff}
              onChange={(e) => setTariff(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Например, 4500"
            />
          </label>
          <label className="text-sm font-semibold text-zinc-700">
            Фикс. сумма (необязательно)
            <input
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Например, 5000"
            />
          </label>
        </div>
        <div className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-3" data-testid="office-accruals-generate-batch">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <input
                type="checkbox"
                checked={batchMode}
                onChange={(e) => setBatchMode(e.target.checked)}
              />
              Batch режим
            </label>
            <span className="text-xs text-zinc-500">Для массовой генерации по выбранным участкам.</span>
          </div>
          {batchMode ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-zinc-700">
                Область
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as "all" | "filtered" | "selected")}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  <option value="all">Все участки</option>
                  <option value="filtered">Фильтр</option>
                  <option value="selected">Выбранные</option>
                </select>
              </label>
              {scope === "filtered" ? (
                <label className="text-sm font-semibold text-zinc-700">
                  Фильтр (по участку/метке)
                  <input
                    value={plotQuery}
                    onChange={(e) => setPlotQuery(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    placeholder="Например, Берёзовая"
                  />
                </label>
              ) : null}
              {scope === "selected" ? (
                <label className="text-sm font-semibold text-zinc-700 sm:col-span-2">
                  Участки (plotId через запятую)
                  <input
                    value={plotIdsRaw}
                    onChange={(e) => setPlotIdsRaw(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    placeholder="p1,p2,p3"
                  />
                </label>
              ) : null}
            </div>
          ) : null}
        </div>
        {showReason && (
          <div className="mt-3">
            <label className="text-sm font-semibold text-zinc-700">
              Причина изменения (если период закрыт)
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                data-testid="office-reason-input"
              />
            </label>
            <button
              type="button"
              onClick={retryWithReason}
              className="mt-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700"
              data-testid="office-reason-submit-retry"
            >
              Повторить с причиной
            </button>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runPreview()}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
            data-testid="office-accruals-generate-preview"
          >
            Предпросмотр
          </button>
          <button
            type="button"
            onClick={() => void runGenerate()}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white"
            data-testid="office-accruals-generate-submit"
          >
            Сгенерировать
          </button>
        </div>
      </div>

      {loading ? <OfficeLoadingState message="Обработка..." /> : null}
      {error ? <OfficeErrorState message={error} /> : null}

      {preview ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-accruals-generate-preview-result">
          <div className="text-sm font-semibold text-zinc-900">Предпросмотр</div>
          <div className="mt-2 text-sm text-zinc-700">Всего участков: {preview.totals.count}</div>
          <div className="mt-1 text-sm text-zinc-700">Сумма: {preview.totals.totalAmount}</div>
          <div className="mt-3 space-y-2 text-sm text-zinc-600">
            {preview.rows.map((row) => (
              <div key={row.plotId}>
                {row.plotLabel}: {row.amount} {row.discount > 0 ? `(скидка ${row.discount}%)` : ""}
              </div>
            ))}
          </div>
        </div>
      ) : !loading && !error ? (
        <OfficeEmptyState message="Сформируйте предпросмотр начислений." />
      ) : null}

      {result ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-accruals-generate-result">
          <div className="text-sm font-semibold text-zinc-900">Результат</div>
          <div className="mt-2 text-sm text-zinc-700">Создано: {result.createdCount}</div>
          <div className="mt-1 text-sm text-zinc-700">Пропущено: {result.skippedCount}</div>
        </div>
      ) : null}
    </div>
  );
}
