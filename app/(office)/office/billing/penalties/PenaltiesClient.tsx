"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";

type CalcPreview = {
  dryRun: true;
  totals: { count: number; totalPenalty: number };
  rows: Array<{ plotId: string; plotLabel: string; period: string; penaltyAmount: number }>;
};

type CalcResult = {
  dryRun: false;
  result: {
    updated: number;
    created: number;
    skippedFrozen: number;
    skippedVoided: number;
    skippedZeroDebt: number;
    sample: Array<{ plotId: string; plotLabel: string; oldAmount: number; newAmount: number; action: string }>;
  };
};

type ExceptionRow = {
  id: string;
  plotId: string | null;
  personId: string | null;
  period: string;
  reason: string | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

const getDefaultPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function PenaltiesClient() {
  const [period, setPeriod] = useState(getDefaultPeriod);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CalcPreview | null>(null);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [plotId, setPlotId] = useState("");
  const [personId, setPersonId] = useState("");
  const [reason, setReason] = useState("");
  const [savingException, setSavingException] = useState(false);

  const loadExceptions = async () => {
    try {
      const data = await apiGet<{ exceptions: ExceptionRow[] }>(
        `/api/office/billing/penalties/exceptions?period=${period}`,
      );
      setExceptions(data.exceptions);
    } catch {
      setExceptions([]);
    }
  };

  useEffect(() => {
    void loadExceptions();
  }, [period]);

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setPreview(null);
    try {
      const data = await apiPost<CalcPreview>("/api/office/billing/penalties/calc", {
        period,
        asOf,
        dryRun: true,
      });
      setPreview(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка предпросмотра");
    } finally {
      setLoading(false);
    }
  };

  const runApply = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<CalcResult>("/api/office/billing/penalties/calc", {
        period,
        asOf,
        dryRun: false,
      });
      setResult(data);
      setPreview(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка применения");
    } finally {
      setLoading(false);
    }
  };

  const addException = async () => {
    setSavingException(true);
    setError(null);
    try {
      await apiPost("/api/office/billing/penalties/exceptions", {
        period,
        plotId: plotId.trim() || null,
        personId: personId.trim() || null,
        reason: reason.trim() || null,
      });
      setPlotId("");
      setPersonId("");
      setReason("");
      await loadExceptions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сохранения исключения");
    } finally {
      setSavingException(false);
    }
  };

  if (loading) {
    return <OfficeLoadingState message="Расчёт пени..." testId="office-penalties-loading" />;
  }

  if (error) {
    return <OfficeErrorState message={error} testId="office-penalties-error" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-zinc-700">
            Период
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-zinc-700">
            Дата расчёта
            <input
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runPreview}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#536443]"
            data-testid="office-penalties-preview"
          >
            Предпросмотр
          </button>
          <button
            type="button"
            onClick={runApply}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
            data-testid="office-penalties-apply"
          >
            Применить
          </button>
        </div>
      </div>

      {preview && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Предпросмотр</div>
          <div className="mt-2 text-sm text-zinc-600">
            Участков: {preview.totals.count} · Сумма: {formatCurrency(preview.totals.totalPenalty)}
          </div>
          {preview.rows.length === 0 ? (
            <OfficeEmptyState message="Нет долгов для начисления пени." testId="office-penalties-empty" />
          ) : (
            <div className="mt-3 space-y-1 text-xs text-zinc-600">
              {preview.rows.map((row) => (
                <div key={`${row.plotId}-${row.period}`}>
                  {row.plotLabel} · {formatCurrency(row.penaltyAmount)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
          Начислено/обновлено: {result.result.created + result.result.updated}, пропущено:{" "}
          {result.result.skippedFrozen + result.result.skippedVoided + result.result.skippedZeroDebt}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Исключения</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="plotId (если есть)"
            value={plotId}
            onChange={(e) => setPlotId(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="personId (если есть)"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm sm:col-span-2"
            placeholder="Причина"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="mt-3 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
          onClick={addException}
          disabled={savingException}
          data-testid="office-penalties-exception-add"
        >
          Добавить исключение
        </button>
        <div className="mt-3 space-y-2">
          {exceptions.length === 0 ? (
            <OfficeEmptyState message="Исключений нет." testId="office-penalties-exceptions-empty" />
          ) : (
            exceptions.map((exc) => (
              <div key={exc.id} className="rounded-lg border border-zinc-200 p-3 text-xs text-zinc-600">
                {exc.period} · plot: {exc.plotId ?? "—"} · person: {exc.personId ?? "—"} · {exc.reason ?? "—"}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
