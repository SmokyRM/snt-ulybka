"use client";

import { useEffect, useState } from "react";
import type { FeeTariff, FeeTariffStatus } from "@/lib/billing";
import TariffDialog from "./TariffDialog";
import { isApiOk, parseApiJson, readOk } from "@/lib/api/client";

export default function BillingTariffsClient() {
  const [tariffs, setTariffs] = useState<FeeTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<FeeTariff | null>(null);

  const loadTariffs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/billing/tariffs", { cache: "no-store" });
      const { tariffs } = await readOk<{ tariffs: FeeTariff[] }>(res);
      setTariffs(tariffs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTariffs();
  }, []);

  const handleCreate = () => {
    setEditingTariff(null);
    setDialogOpen(true);
  };

  const handleEdit = (tariff: FeeTariff) => {
    setEditingTariff(tariff);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTariff(null);
  };

  const handleSave = async (data: {
    type: string;
    title: string;
    amount: number;
    appliesTo: "plot" | "area";
    activeFrom: string;
    activeTo: string | null;
    status: FeeTariffStatus;
    overrideOverlap: boolean;
  }) => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const url = "/api/admin/billing/tariffs";
      const method = editingTariff ? "PUT" : "POST";
      const body = editingTariff ? { ...data, id: editingTariff.id } : data;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await parseApiJson(res);
      if (!isApiOk(payload)) {
        const details = payload.error.details;
        const overlap =
          typeof details === "object" &&
          details !== null &&
          "overlap" in details &&
          Boolean((details as { overlap?: boolean }).overlap);
        if (overlap) {
          setError("Тарифы пересекаются. Установите флаг 'Переопределить перекрытие' для принудительного сохранения.");
        } else {
          setError(payload.error.message || "Ошибка сохранения");
        }
        return;
      }

      setMessage(editingTariff ? "Тариф обновлён" : "Тариф создан");
      setDialogOpen(false);
      setEditingTariff(null);
      await loadTariffs();

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            + Создать тариф
          </button>
        </div>
        {loading && <span className="text-sm text-zinc-600">Обновление...</span>}
      </div>

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-900" : "border-green-200 bg-green-50 text-green-900"}`}
          role="alert"
        >
          {message && <span>{message}</span>}
          {error && <span>{error}</span>}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Тип</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Название</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Сумма</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Применяется к</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действует с</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действует до</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Статус</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {tariffs.map((tariff) => (
                <tr key={tariff.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                      {tariff.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{tariff.title}</td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatAmount(tariff.amount)}</td>
                  <td className="px-4 py-3 text-zinc-600">{tariff.appliesTo === "plot" ? "Участок" : "Площадь"}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatDate(tariff.activeFrom)}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {tariff.activeTo ? formatDate(tariff.activeTo) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        tariff.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {tariff.status === "active" ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit(tariff)}
                      className="text-[#5E704F] hover:underline"
                    >
                      Редактировать
                    </button>
                  </td>
                </tr>
              ))}
              {tariffs.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    Тарифы не найдены. Создайте первый тариф.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TariffDialog open={dialogOpen} onClose={handleDialogClose} onSave={handleSave} editingTariff={editingTariff} />
    </div>
  );
}
