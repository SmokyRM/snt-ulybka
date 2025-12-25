"use client";

import { useEffect, useState } from "react";

type Item = {
  plotId: string;
  street: string;
  number: string;
  ownerName: string;
  amountAccrued: number;
  amountPaid: number;
  debt: number;
  text: string;
};

type ResponseData = { items: Item[]; error?: string };

export default function DebtorsClient() {
  const now = new Date();
  const [type, setType] = useState<"membership" | "electricity">("membership");
  const [period, setPeriod] = useState<string>(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/notifications/debtors?type=${type}&period=${period}`, { cache: "no-store" });
      const data = (await res.json()) as ResponseData;
      if (!res.ok || data.error) {
        setError(data.error ?? "Не удалось загрузить данные");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Не удалось скопировать текст");
    }
  };

  const exportCsv = () => {
    window.location.href = `/api/admin/notifications/debtors/export.csv?type=${type}&period=${period}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="text-sm text-zinc-700">
          Тип
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "membership" | "electricity")}
            className="mt-1 w-48 rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="membership">Членские взносы</option>
            <option value="electricity">Электроэнергия</option>
          </select>
        </label>
        <label className="text-sm text-zinc-700">
          Период (YYYY-MM)
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="mt-1 w-32 rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="2025-01"
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
          onClick={exportCsv}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
        >
          Экспорт CSV
        </button>
        {loading && <span className="text-sm text-zinc-600">Загрузка...</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>

      <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-зinc-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Улица</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Участок</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">ФИО</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Начислено</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Оплачено</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Долг</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Текст уведомления</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-зinc-100">
            {items.map((item) => (
              <tr key={item.plotId} className={item.debt > 0 ? "bg-red-50/40" : undefined}>
                <td className="px-3 py-2">{item.street}</td>
                <td className="px-3 py-2">{item.number}</td>
                <td className="px-3 py-2">{item.ownerName}</td>
                <td className="px-3 py-2">{item.amountAccrued.toFixed(2)}</td>
                <td className="px-3 py-2">{item.amountPaid.toFixed(2)}</td>
                <td className="px-3 py-2">{item.debt.toFixed(2)}</td>
                <td className="px-3 py-2 max-w-xl">
                  <div className="flex items-start gap-2">
                    <span className="flex-1 text-xs sm:text-sm">{item.text}</span>
                    <button
                      type="button"
                      onClick={() => copyText(item.text)}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-зinc-100"
                    >
                      Скопировать
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-зinc-600" colSpan={7}>
                  Нет должников за указанный период.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
