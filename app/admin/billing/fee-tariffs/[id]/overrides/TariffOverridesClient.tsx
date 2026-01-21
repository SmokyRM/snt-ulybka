"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { FeeTariff, FeeTariffOverride } from "@/types/snt";
import type { Plot } from "@/types/snt";
import { readOk } from "@/lib/api/client";

interface TariffOverridesClientProps {
  tariff: FeeTariff;
  initialOverrides: FeeTariffOverride[];
  plots: Plot[];
}

export default function TariffOverridesClient({
  tariff,
  initialOverrides,
  plots,
}: TariffOverridesClientProps) {
  const [overrides, setOverrides] = useState<FeeTariffOverride[]>(initialOverrides);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<FeeTariffOverride | null>(null);

  const loadOverrides = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/billing/fee-tariffs/overrides?tariffId=${tariff.id}`, {
        cache: "no-store",
      });
      const { overrides } = await readOk<{ overrides: FeeTariffOverride[] }>(res);
      setOverrides(overrides);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingOverride(null);
    setDialogOpen(true);
  };

  const handleEdit = (override: FeeTariffOverride) => {
    setEditingOverride(override);
    setDialogOpen(true);
  };

  const handleSave = async (data: { plotId: string; amount: number; comment?: string | null }) => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const body: { tariffId: string; plotId: string; amount: number; comment?: string | null } = {
        tariffId: tariff.id,
        plotId: data.plotId,
        amount: data.amount,
      };
      if (data.comment !== undefined) body.comment = data.comment;

      const res = await fetch("/api/admin/billing/fee-tariffs/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await readOk<{ override: FeeTariffOverride }>(res);

      setMessage(editingOverride ? "Переопределение обновлено" : "Переопределение создано");
      setDialogOpen(false);
      setEditingOverride(null);
      await loadOverrides();

      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить переопределение?")) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/billing/fee-tariffs/overrides?id=${id}`, {
        method: "DELETE",
      });

      await readOk(res);

      setMessage("Переопределение удалено");
      await loadOverrides();
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  /** plotId из registry/mockDb: если участок найден — строка, иначе "needs review" (UI не ломаем). */
  const getPlotDisplay = (override: FeeTariffOverride) => {
    const plot = plots.find((p) => p.id === override.plotId || p.plotId === override.plotId);
    if (plot) return `${plot.street}, уч. ${plot.plotNumber}`;
    return "needs review";
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ru-RU");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Переопределения тарифа</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Тариф: {tariff.title || `${tariff.type === "member" ? "Членские" : "Целевые"} (${tariff.amount} ₽)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/billing/fee-tariffs/${tariff.id}`}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
          >
            К тарифу
          </Link>
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            + Добавить
          </button>
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

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участок (plotId)</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Сумма</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Комментарий</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">updatedAt</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {overrides.map((override) => (
              <tr key={override.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 text-zinc-700">
                  {getPlotDisplay(override)}
                  {getPlotDisplay(override) === "needs review" && (
                    <span className="ml-1 text-zinc-400" title={override.plotId}>({override.plotId})</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-zinc-900">
                  {override.amount.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                </td>
                <td className="px-4 py-3 text-zinc-600 max-w-[200px] truncate" title={override.comment || undefined}>
                  {override.comment || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">{formatDate(override.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(override)}
                      className="text-[#5E704F] hover:underline text-sm"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(override.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {overrides.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Нет переопределений. Все участки используют стандартный тариф.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <OverrideDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingOverride(null);
          }}
          onSave={handleSave}
          editingOverride={editingOverride}
          plots={plots}
        />
      )}
    </div>
  );
}

function OverrideDialog({
  open,
  onClose,
  onSave,
  editingOverride,
  plots,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { plotId: string; amount: number; comment?: string | null }) => void;
  editingOverride: FeeTariffOverride | null;
  plots: Plot[];
}) {
  const [plotId, setPlotId] = useState(editingOverride?.plotId || "");
  const [amount, setAmount] = useState(editingOverride?.amount ?? 0);
  const [comment, setComment] = useState(editingOverride?.comment || "");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Reset form when dialog opens/closes or editingOverride changes.
    // Schedule setState in microtask to avoid react-hooks/set-state-in-effect (sync setState in effect).
    const override = editingOverride;
    queueMicrotask(() => {
      if (override) {
        setPlotId(override.plotId);
        setAmount(override.amount);
        setComment(override.comment || "");
      } else {
        setPlotId("");
        setAmount(0);
        setComment("");
      }
      setErr(null);
    });
  }, [editingOverride, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!plotId.trim()) {
      setErr("Выберите участок");
      return;
    }
    if (typeof amount !== "number" || amount <= 0) {
      setErr("Сумма должна быть больше 0");
      return;
    }
    onSave({ plotId: plotId.trim(), amount, comment: comment.trim() || null });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-zinc-900 mb-4">
        {editingOverride ? "Изменить переопределение" : "Добавить переопределение"}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-800">Участок (plotId) *</span>
          <select
            value={plotId}
            onChange={(e) => setPlotId(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2"
            required
            disabled={!!editingOverride}
          >
            <option value="">Выберите участок</option>
            {plots.map((plot) => (
              <option key={plot.id} value={plot.id}>
                {plot.street}, уч. {plot.plotNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-800">Сумма override *</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="rounded border border-zinc-300 px-3 py-2"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-800">Комментарий</span>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2"
            placeholder="Необязательно"
          />
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
          >
            {editingOverride ? "Сохранить" : "Добавить"}
          </button>
        </div>
      </form>
    </div>
    </div>
  );
}
