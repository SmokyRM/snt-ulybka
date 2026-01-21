"use client";

import { useEffect, useState } from "react";
import { readOk } from "@/lib/api/client";

type Tariff = {
  id: string;
  pricePerKwh: number;
  validFrom: string;
  createdAt: string;
};

type TariffResponse = {
  tariffs: Tariff[];
};

export default function ClientTariffs() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [price, setPrice] = useState<string>("");
  const [validFrom, setValidFrom] = useState<string>("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadTariffs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/electricity/tariffs", { cache: "no-store" });
      const data = await readOk<TariffResponse>(res);
      setTariffs(data.tariffs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTariffs();
  }, []);

  const submitTariff = async () => {
    setError(null);
    setMessage(null);
    const priceValue = Number(price.replace(",", "."));
    if (!Number.isFinite(priceValue) || priceValue <= 0 || !validFrom) {
      setError("Укажите корректные данные тарифа");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/electricity/tariffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricePerKwh: priceValue, validFrom }),
      });
      await readOk<{ tariff: Tariff }>(res);
      setPrice("");
      setValidFrom("");
      await loadTariffs();
      setMessage("Тариф сохранён");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const accrue = async () => {
    setError(null);
    setMessage(null);
    const yearNum = Number(year);
    const monthNum = Number(month);
    if (!Number.isInteger(yearNum) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      setError("Неверный период");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/electricity/accrue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: yearNum, month: monthNum }),
      });
      const data = await readOk<{ updatedCount?: number }>(res);
      setMessage(
        `Начислено за ${monthNum.toString().padStart(2, "0")}.${yearNum}: обновлено ${(
          data.updatedCount ?? 0
        )}`
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Добавить тариф</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-zinc-700">
            Цена за кВт·ч
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Дата начала действия
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={submitTariff}
              disabled={loading}
              className="w-full rounded bg-[#5E704F] px-4 py-2 font-semibold text-white hover:bg-[#4f5f42] disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Начислить электроэнергию</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-zinc-700">
            Год
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Месяц
            <input
              type="number"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              min={1}
              max={12}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={accrue}
              disabled={loading}
              className="w-full rounded border border-[#5E704F] px-4 py-2 font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400"
            >
              Начислить
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Список тарифов</h2>
          {loading && <span className="text-sm text-zinc-600">Обновление...</span>}
        </div>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Дата начала</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Тариф, ₽/кВт·ч</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Создан</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tariffs.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2">{new Date(t.validFrom).toLocaleDateString("ru-RU")}</td>
                  <td className="px-3 py-2">{t.pricePerKwh.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {new Date(t.createdAt).toLocaleString("ru-RU", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {tariffs.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-zinc-600" colSpan={3}>
                    Тарифы не заданы
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(message || error) && (
        <div className="rounded border px-3 py-2 text-sm" role="status">
          {message && <span className="text-green-700">{message}</span>}
          {error && <span className="text-red-700">{error}</span>}
        </div>
      )}
    </div>
  );
}
