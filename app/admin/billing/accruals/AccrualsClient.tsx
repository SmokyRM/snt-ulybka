"use client";

import { useState } from "react";
import Link from "next/link";
import type { UnifiedBillingPeriod } from "@/types/snt";
import { readOk } from "@/lib/api/client";

type PeriodWithSummary = UnifiedBillingPeriod & {
  accrualsCount: number;
  totalAccrued: number;
  totalPaid: number;
};

export default function AccrualsClient({ initialPeriods }: { initialPeriods: PeriodWithSummary[] }) {
  const [periods, setPeriods] = useState<PeriodWithSummary[]>(initialPeriods);
  const [createOpen, setCreateOpen] = useState(false);
  const [createYear, setCreateYear] = useState(new Date().getFullYear());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatAmount = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";

  const handleCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/billing/accruals/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: createYear }),
      });
      const data = await readOk<{ period?: PeriodWithSummary }>(res);
      setCreateOpen(false);
      const period = data?.period ?? null;
      if (!period || !period.id) {
        setError("Не удалось получить период: отсутствует id");
        return;
      }
      if (period) {
        type PeriodWithId = typeof period & { id: string };
        const periodWithId: PeriodWithId = period;
        setPeriods((prev) => [
          { ...periodWithId, accrualsCount: 0, totalAccrued: 0, totalPaid: 0 },
          ...prev,
        ]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const statusLabel = (s: string) => {
    const l: Record<string, string> = { draft: "черновик", locked: "зафиксирован", approved: "утверждён", closed: "закрыт" };
    return l[s] ?? s;
  };

  return (
    <div className="space-y-4" data-testid="accruals-root">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          data-testid="accruals-period-create"
          onClick={() => setCreateOpen(true)}
          className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] hover:bg-[#5E704F] hover:text-white"
        >
          Создать период
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Период</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Статус</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Начислений</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Начислено</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Оплачено</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {periods.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
                    <div className="text-base font-semibold text-zinc-900">Нет периодов</div>
                    <p className="mt-2 text-sm text-zinc-600">Создайте первый период начислений.</p>
                    <button
                      type="button"
                      onClick={() => setCreateOpen(true)}
                      className="mt-4 rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
                    >
                      Создать период
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              periods.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">{p.title ?? `${p.from} — ${p.to}`}</span>
                    <span className="ml-2 text-zinc-500">{p.from} — {p.to}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{statusLabel(p.status)}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">{p.accrualsCount}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">{formatAmount(p.totalAccrued)}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">{formatAmount(p.totalPaid)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/billing/accruals/${p.id}`}
                      className="text-[#5E704F] hover:underline font-medium"
                    >
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-zinc-900">Создать период (draft)</h3>
            <p className="mt-1 text-sm text-zinc-600">Год, например 2025.</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-800">Год</label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={createYear}
                onChange={(e) => setCreateYear(Number(e.target.value))}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41] disabled:opacity-70"
              >
                {creating ? "Создание…" : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
