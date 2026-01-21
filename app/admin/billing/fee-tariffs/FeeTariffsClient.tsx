"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { FeeTariff } from "@/types/snt";
import { readOk } from "@/lib/api/client";

interface FeeTariffsClientProps {
  initialTariffs: FeeTariff[];
}

export default function FeeTariffsClient({ initialTariffs }: FeeTariffsClientProps) {
  const [tariffs, setTariffs] = useState<FeeTariff[]>(initialTariffs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadTariffs = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing/fee-tariffs", { cache: "no-store" });
      const { tariffs } = await readOk<{ tariffs: FeeTariff[] }>(res);
      setTariffs(tariffs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTariffs();
  }, []);

  const handleCreate = async (data: { name: string; year: number; amount: number }) => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/billing/fee-tariffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          year: data.year,
          amount: data.amount,
          type: "member",
          method: "fixed",
        }),
      });
      await readOk(res);
      setMessage("Тариф создан");
      setCreateOpen(false);
      void loadTariffs();
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU");
  };

  const yearFrom = (activeFrom: string) => {
    return activeFrom ? String(activeFrom).slice(0, 4) : "—";
  };

  const statusLabel = (t: FeeTariff) => (t.status === "draft" ? "draft" : "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
        >
          Создать
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
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Период/год</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Ставка/сумма</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Статус</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">updatedAt</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {tariffs.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-900">{t.title || "—"}</td>
                <td className="px-4 py-3 text-zinc-700">{yearFrom(t.activeFrom)}</td>
                <td className="px-4 py-3 text-right text-zinc-900">
                  {t.amount.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                </td>
                <td className="px-4 py-3 text-zinc-700">{statusLabel(t)}</td>
                <td className="px-4 py-3 text-zinc-600">{formatDate(t.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/billing/fee-tariffs/${t.id}`}
                      className="text-[#5E704F] hover:underline text-sm"
                    >
                      Редактировать
                    </Link>
                    <Link
                      href={`/admin/billing/fee-tariffs/${t.id}/overrides`}
                      className="text-zinc-600 hover:underline text-sm"
                    >
                      Переопределения
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {tariffs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Нет тарифов. Создайте первый.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <CreateTariffModal
          onClose={() => setCreateOpen(false)}
          onSave={handleCreate}
          saving={loading}
        />
      )}
    </div>
  );
}

function CreateTariffModal({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: (data: { name: string; year: number; amount: number }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const n = name.trim();
    if (!n) {
      setErr("Название обязательно");
      return;
    }
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      setErr("Сумма должна быть больше 0");
      return;
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setErr("Некорректный год");
      return;
    }
    onSave({ name: n, year, amount: a });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">Создать тариф</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">Название *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">Год/период *</span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded border border-zinc-300 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">Сумма *</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
              required
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
              disabled={saving}
              className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-70"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
