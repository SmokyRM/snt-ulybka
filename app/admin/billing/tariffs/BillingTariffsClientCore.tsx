"use client";

import { useEffect, useState } from "react";
import type { ContributionTariff } from "@/lib/billing/core";
import TariffDialog from "./TariffDialogCore";
import { readOk } from "@/lib/api/client";

export default function BillingTariffsClientCore() {
  const [tariffs, setTariffs] = useState<ContributionTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<ContributionTariff | null>(null);

  const loadTariffs = async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/billing/core/tariffs", { cache: "no-store" });
      const { tariffs } = await readOk<{ tariffs: ContributionTariff[] }>(res);
      setTariffs(tariffs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Use setTimeout to ensure component is mounted before state updates
    const timeoutId = setTimeout(() => {
      loadTariffs();
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = () => {
    setEditingTariff(null);
    setDialogOpen(true);
  };

  const handleEdit = (tariff: ContributionTariff) => {
    setEditingTariff(tariff);
    setDialogOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    code: string;
    amount: number;
    unit: ContributionTariff["unit"];
    recurrence: ContributionTariff["recurrence"];
    active: boolean;
  }) => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const url = "/api/admin/billing/core/tariffs";
      const method = editingTariff ? "PUT" : "POST";
      const body = editingTariff ? { id: editingTariff.id, ...data } : data;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await readOk<{ tariff: ContributionTariff }>(res);

      setMessage(editingTariff ? "Тариф обновлён" : "Тариф создан");
      setDialogOpen(false);
      setEditingTariff(null);
      await loadTariffs();

      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить тариф?")) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/billing/core/tariffs?id=${id}`, {
        method: "DELETE",
      });

      await readOk<{ ok: boolean }>(res);

      setMessage("Тариф удалён");
      await loadTariffs();
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && tariffs.length === 0) {
    return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Список тарифов</h2>
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
        >
          + Создать тариф
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
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Название</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Код</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Сумма, ₽</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Единица</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Частота</th>
              <th className="px-4 py-3 text-center font-semibold text-zinc-700">Статус</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {tariffs.map((tariff) => (
              <tr key={tariff.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-900">{tariff.name}</td>
                <td className="px-4 py-3 text-zinc-600 font-mono text-xs">{tariff.code}</td>
                <td className="px-4 py-3 text-right font-medium text-zinc-900">{tariff.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-zinc-600">{tariff.unit === "plot" ? "Участок" : "Площадь"}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {tariff.recurrence === "monthly" ? "Ежемесячно" :
                   tariff.recurrence === "quarterly" ? "Ежеквартально" :
                   tariff.recurrence === "yearly" ? "Ежегодно" :
                   "Одноразово"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                      tariff.active ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {tariff.active ? "Активен" : "Неактивен"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(tariff)}
                      className="text-[#5E704F] hover:underline text-sm"
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tariff.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tariffs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Нет тарифов. Создайте первый тариф.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TariffDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingTariff(null); }} onSave={handleSave} editingTariff={editingTariff} />
    </div>
  );
}
