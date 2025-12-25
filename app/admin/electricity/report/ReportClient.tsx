"use client";

import { useEffect, useState } from "react";

type ReportItem = {
  plotId: string;
  street: string;
  number: string;
  deltaKwh: number;
  amountAccrued: number;
  amountPaid: number;
  debt: number;
};

type ReportResponse = {
  items: ReportItem[];
};

export default function ReportClient() {
  const now = new Date();
  const [year, setYear] = useState<string>(now.getFullYear().toString());
  const [month, setMonth] = useState<string>((now.getMonth() + 1).toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/electricity/report?year=${year}&month=${month}`, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Не удалось загрузить отчёт");
        return;
      }
      const data = (await res.json()) as ReportResponse;
      setItems(data.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecalc = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/electricity/accrue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year), month: Number(month) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Ошибка начисления");
      } else {
        setMessage("Начисление завершено");
        await load();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    window.location.href = `/api/admin/electricity/report/export.csv?year=${year}&month=${month}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="text-sm text-zinc-700">
          Год
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="mt-1 w-28 rounded border border-zinc-300 px-2 py-1"
          />
        </label>
        <label className="text-sm text-zinc-700">
          Месяц
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 w-20 rounded border border-zinc-300 px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          Показать
        </button>
        <button
          type="button"
          onClick={handleRecalc}
          disabled={loading}
          className="rounded border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400"
        >
          Пересчитать
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-зinc-100"
        >
          Экспорт CSV
        </button>
        {loading && <span className="text-sm text-зinc-600">Обновляем...</span>}
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}

      <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-зinc-200 text-sm">
          <thead className="bg-зinc-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Улица</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Участок</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Δ кВт</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Начислено ₽</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Оплачено ₽</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Долг ₽</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-зinc-100">
            {items.map((item) => {
              const debtPositive = item.debt > 0.001;
              return (
                <tr key={item.plotId} className={debtPositive ? "bg-red-50/50" : undefined}>
                  <td className="px-3 py-2">{item.street}</td>
                  <td className="px-3 py-2">{item.number}</td>
                  <td className="px-3 py-2">{item.deltaKwh.toFixed(2)}</td>
                  <td className="px-3 py-2">{item.amountAccrued.toFixed(2)}</td>
                  <td className="px-3 py-2">{item.amountPaid.toFixed(2)}</td>
                  <td className="px-3 py-2">{item.debt.toFixed(2)}</td>
                  <td className="px-3 py-2 space-x-2">
                    <a
                      href={`/admin/electricity/readings?plotId=${item.plotId}`}
                      className="text-[#5E704F] underline"
                    >
                      Показания
                    </a>
                    <a
                      href={`/admin/registry/${item.plotId}`}
                      className="text-[#5E704F] underline"
                    >
                      Платежи
                    </a>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-зinc-600" colSpan={7}>
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
