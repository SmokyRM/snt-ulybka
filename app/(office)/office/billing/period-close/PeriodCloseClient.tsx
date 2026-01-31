"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";

type Snapshot = {
  accruedTotal: number;
  paidTotal: number;
  debtTotal: number;
  penaltyTotal: number;
  paymentsCount: number;
  debtorsCount: number;
};

type PeriodCloseData = {
  period: string;
  status: "open" | "closed";
  closedAt: string | null;
  closedBy: string | null;
  snapshot: Snapshot | null;
  current: Snapshot;
};

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default function PeriodCloseClient({ initialPeriod }: { initialPeriod: string }) {
  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState<PeriodCloseData | null>(null);
  const [changes, setChanges] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closeLoading, setCloseLoading] = useState(false);

  const periodLabel = useMemo(() => period || new Date().toISOString().slice(0, 7), [period]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiGet<PeriodCloseData>(`/api/office/billing/period-close?period=${periodLabel}`);
      setData(payload);
      const changesPayload = await apiGet<{ items: AuditLog[] }>(
        `/api/office/billing/period-close/${periodLabel}/changes`,
      );
      setChanges(changesPayload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [periodLabel]);

  const handleClose = async () => {
    setCloseLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/billing/period-close", { period: periodLabel });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка закрытия периода");
    } finally {
      setCloseLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-900">Период</div>
            <p className="text-xs text-zinc-500">Выберите месяц для закрытия</p>
          </div>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading && <OfficeLoadingState message="Загрузка..." testId="office-period-close-loading" />}
      {error && <OfficeErrorState message={error} onRetry={load} testId="office-period-close-error" />}

      {data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Текущие агрегаты</div>
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              <div>Начислено: {formatCurrency(data.current.accruedTotal)}</div>
              <div>Оплачено: {formatCurrency(data.current.paidTotal)}</div>
              <div>Долг: {formatCurrency(data.current.debtTotal)}</div>
              <div>Пени: {formatCurrency(data.current.penaltyTotal)}</div>
              <div>Платежей: {data.current.paymentsCount}</div>
              <div>Должников: {data.current.debtorsCount}</div>
            </div>
            <div className="mt-4">
              {data.status === "closed" ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Период закрыт
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={closeLoading}
                  className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {closeLoading ? "Закрываем..." : "Закрыть период"}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Снимок при закрытии</div>
            {data.snapshot ? (
              <div className="mt-3 space-y-2 text-sm text-zinc-700">
                <div>Начислено: {formatCurrency(data.snapshot.accruedTotal)}</div>
                <div>Оплачено: {formatCurrency(data.snapshot.paidTotal)}</div>
                <div>Долг: {formatCurrency(data.snapshot.debtTotal)}</div>
                <div>Пени: {formatCurrency(data.snapshot.penaltyTotal)}</div>
                <div>Платежей: {data.snapshot.paymentsCount}</div>
                <div>Должников: {data.snapshot.debtorsCount}</div>
                <div className="text-xs text-zinc-500">
                  Закрыт: {data.closedAt ? new Date(data.closedAt).toLocaleString("ru-RU") : "—"}
                </div>
              </div>
            ) : (
              <OfficeEmptyState message="Период пока не закрыт." />
            )}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Изменения после закрытия</div>
        {changes.length === 0 ? (
          <OfficeEmptyState message="Изменений пока нет." />
        ) : (
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            {changes.map((log) => (
              <div key={log.id} className="rounded-lg border border-zinc-200 p-3">
                <div className="text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString("ru-RU")}</div>
                <div className="font-semibold text-zinc-900">{log.action}</div>
                <div className="text-xs text-zinc-500">{log.entity}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
