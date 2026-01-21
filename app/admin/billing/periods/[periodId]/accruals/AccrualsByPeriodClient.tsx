"use client";

import { useEffect, useState } from "react";
import type { BillingPeriod } from "@/lib/billing/core";
import { readOk } from "@/lib/api/client";

interface AccrualRow {
  id: string;
  plotId: string;
  street: string;
  plotNumber: string;
  ownerName: string;
  tariffId: string;
  tariffName: string;
  amount: number;
}

interface AccrualsByPeriodClientProps {
  periodId: string;
  period: BillingPeriod;
}

export default function AccrualsByPeriodClient({ periodId, period }: AccrualsByPeriodClientProps) {
  const [accruals, setAccruals] = useState<AccrualRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [totals, setTotals] = useState({ accrued: 0, paid: 0, debt: 0 });

  const loadAccruals = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/billing/core/periods/${periodId}/accruals`, { cache: "no-store" });
      const json = await readOk<{
        accruals: AccrualRow[];
        totals: { accrued: number; paid: number; debt: number };
      }>(res);
      setAccruals(json.accruals);
      setTotals(json.totals);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!periodId) return;
    // Use setTimeout to ensure component is mounted before state updates
    const timeoutId = setTimeout(() => {
      loadAccruals();
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId]);

  const handleGenerate = async () => {
    if (period.status === "closed") {
      if (!confirm("Период закрыт. Хотите открыть его для генерации начислений?")) return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/billing/core/periods/${periodId}/accruals/generate`, {
        method: "POST",
        cache: "no-store",
      });

      const data = await readOk<{ count?: number }>(res);
      setMessage(`Начисления сформированы: ${data.count || 0} записей`);
      await loadAccruals();

      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/admin/billing/core/periods/${periodId}/accruals?format=csv`;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <div>
          <div className="text-xs text-zinc-600">Начислено</div>
          <div className="text-lg font-semibold text-zinc-900">{formatAmount(totals.accrued)}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-600">Оплачено</div>
          <div className="text-lg font-semibold text-green-700">{formatAmount(totals.paid)}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-600">Долг</div>
          <div className="text-lg font-semibold text-red-700">{formatAmount(totals.debt)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Начисления</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Сформируйте начисления для всех участков на основе активных тарифов.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || period.status === "closed"}
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Сформировать начисления
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={accruals.length === 0}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400"
            >
              Экспорт CSV
            </button>
          </div>
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

      {/* Table */}
      {loading && accruals.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">
          Загрузка...
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участок</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Владелец</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Тариф</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">Сумма, ₽</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {accruals.map((accrual) => (
                  <tr key={accrual.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      {accrual.street}, {accrual.plotNumber}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{accrual.ownerName || "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{accrual.tariffName}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {formatAmount(accrual.amount)}
                    </td>
                  </tr>
                ))}
                {accruals.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      Начисления не найдены. Нажмите &quot;Сформировать начисления&quot; для создания.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
