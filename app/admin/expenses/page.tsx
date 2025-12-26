"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Expense = {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  vendor?: string | null;
  createdAt: string;
};

export default function ExpensesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    category: "roads",
    description: "",
    vendor: "",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/expenses", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Ошибка загрузки");
        return;
      }
      setItems(data.items as Expense[]);
      setTotal(data.total as number);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          amount: Number(form.amount),
          category: form.category,
          description: form.description,
          vendor: form.vendor || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Ошибка сохранения");
        return;
      }
      setForm({ ...form, amount: "", description: "", vendor: "" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Расходы</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Добавить расход</h2>
          <form onSubmit={handleSubmit} className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-800">Дата</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-800">Сумма</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-800">Категория</span>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
              >
                <option value="roads">Дороги</option>
                <option value="trash">Вывоз мусора</option>
                <option value="security">Охрана</option>
                <option value="lighting">Освещение</option>
                <option value="electricity">Электроэнергия</option>
                <option value="other">Другое</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-800">Подрядчик</span>
              <input
                type="text"
                value={form.vendor}
                onChange={(e) => setForm((prev) => ({ ...prev, vendor: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="sm:col-span-2 lg:col-span-4 flex flex-col gap-1">
              <span className="font-semibold text-zinc-800">Описание</span>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
              >
                {loading ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </form>
          {error && <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm text-zinc-800">
            <div>Всего расходов: {total.toFixed(2)} ₽</div>
            <div className="text-zinc-600">Показаны все расходы (фильтры добавим позже)</div>
          </div>
          <div className="mt-3 overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Дата</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Сумма</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Категория</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Описание</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Подрядчик</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-3 py-2">{i.date.slice(0, 10)}</td>
                    <td className="px-3 py-2">{i.amount.toFixed(2)} ₽</td>
                    <td className="px-3 py-2">{i.category}</td>
                    <td className="px-3 py-2">{i.description}</td>
                    <td className="px-3 py-2">{i.vendor ?? "—"}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center text-zinc-600" colSpan={5}>
                      Расходов пока нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
