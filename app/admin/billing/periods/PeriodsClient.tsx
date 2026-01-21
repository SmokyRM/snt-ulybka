"use client";

import { useState } from "react";
import type { BillingPeriod } from "@/lib/billing/core";
import PeriodDialog from "./PeriodDialog";
import { readOk } from "@/lib/api/client";

interface PeriodsClientProps {
  initialPeriods: BillingPeriod[];
}

export default function PeriodsClient({ initialPeriods }: PeriodsClientProps) {
  const [periods, setPeriods] = useState<BillingPeriod[]>(initialPeriods);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<BillingPeriod | null>(null);

  const loadPeriods = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing/core/periods", { cache: "no-store" });
      const { periods } = await readOk<{ periods: BillingPeriod[] }>(res);
      setPeriods(periods);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPeriod(null);
    setDialogOpen(true);
  };

  const handleEdit = (period: BillingPeriod) => {
    setEditingPeriod(period);
    setDialogOpen(true);
  };

  const handleSave = async (data: { year: number; month: number; status?: BillingPeriod["status"] }) => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const url = "/api/admin/billing/core/periods";
      const method = editingPeriod ? "PUT" : "POST";
      const body = editingPeriod ? { id: editingPeriod.id, ...data } : data;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await readOk(res);

      setMessage(editingPeriod ? "Период обновлён" : "Период создан");
      setDialogOpen(false);
      setEditingPeriod(null);
      await loadPeriods();

      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatPeriod = (period: BillingPeriod) => {
    return `${period.year}-${String(period.month).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Список периодов</h2>
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
        >
          + Создать период
        </button>
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

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Период</th>
              <th className="px-4 py-3 text-center font-semibold text-zinc-700">Статус</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {periods.map((period) => (
              <tr key={period.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-900">{formatPeriod(period)}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                      period.status === "open" ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {period.status === "open" ? "Открыт" : "Закрыт"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <a
                      href={`/admin/billing/periods/${period.id}/accruals`}
                      className="text-[#5E704F] hover:underline text-sm"
                    >
                      Начисления
                    </a>
                    <button
                      type="button"
                      onClick={() => handleEdit(period)}
                      className="text-[#5E704F] hover:underline text-sm"
                    >
                      Редактировать
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {periods.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                  Нет периодов. Создайте первый период.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PeriodDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingPeriod(null); }} onSave={handleSave} editingPeriod={editingPeriod} />
    </div>
  );
}
