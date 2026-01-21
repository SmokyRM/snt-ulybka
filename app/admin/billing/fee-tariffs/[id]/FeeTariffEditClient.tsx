"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FeeTariff } from "@/types/snt";
import { readOk } from "@/lib/api/client";

interface FeeTariffEditClientProps {
  tariff: FeeTariff;
}

export default function FeeTariffEditClient({ tariff }: FeeTariffEditClientProps) {
  const router = useRouter();
  const [name, setName] = useState(tariff.title || "");
  const [year, setYear] = useState(() => {
    const s = String(tariff.activeFrom || "").slice(0, 4);
    return s ? parseInt(s, 10) : new Date().getFullYear();
  });
  const [amount, setAmount] = useState(String(tariff.amount));
  const [status, setStatus] = useState<"active" | "draft">(
    tariff.status === "draft" ? "draft" : "active"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const n = name.trim();
    if (!n) {
      setError("Название обязательно");
      return;
    }
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      setError("Сумма должна быть больше 0");
      return;
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setError("Некорректный год");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing/fee-tariffs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tariff.id,
          name: n,
          year,
          amount: a,
          status,
        }),
      });

      await readOk<{ tariff: FeeTariff }>(res);
      setMessage("Сохранено");
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 mb-4" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 mb-4" role="alert">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-800">Статус *</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "draft")}
            className="rounded border border-zinc-300 px-3 py-2"
            required
          >
            <option value="active">active</option>
            <option value="draft">draft</option>
          </select>
        </label>
        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/billing/fee-tariffs"
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Назад
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-70"
          >
            {loading ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
