"use client";

import { useEffect, useState } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import EmptyStateCard from "@/components/EmptyStateCard";
import { readOk } from "@/lib/api/client";

type ExpenseCategory = {
  id: string;
  name: string;
  description?: string | null;
};

type ExpenseAttachment = {
  url: string;
  filename: string;
  mime?: string | null;
  size?: number | null;
};

type Expense = {
  id: string;
  date: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string;
  vendor?: string | null;
  attachment?: ExpenseAttachment | null;
  createdAt: string;
  updatedAt?: string | null;
};

type ExpensesResponse = {
  items: Expense[];
  total: number;
  summaryByPeriod: Array<{ period: string; count: number; total: number }>;
};

export default function ExpensesClient() {
  const router = useAppRouter();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [items, setItems] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpensesResponse["summaryByPeriod"]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    categoryId: "",
    description: "",
    vendor: "",
    attachment: null as ExpenseAttachment | null,
  });
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    categoryId: "",
  });

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/admin/expenses/categories", { cache: "no-store" });
      const data = await readOk<{ categories: ExpenseCategory[] }>(res);
      setCategories(data.categories || []);
      if (data.categories && data.categories.length > 0 && !form.categoryId) {
        setForm((prev) => ({ ...prev, categoryId: data.categories[0].id }));
      }
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("year", filters.year);
      params.set("month", filters.month);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);

      const res = await fetch(`/api/admin/expenses?${params.toString()}`, { cache: "no-store" });
      const data = await readOk<ExpensesResponse>(res);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setSummary(data.summaryByPeriod || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.year, filters.month, filters.categoryId]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/expenses/upload", {
        method: "POST",
        body: formData,
      });
      const data = await readOk<ExpenseAttachment>(res);
      setForm((prev) => ({
        ...prev,
        attachment: {
          url: data.url,
          filename: data.filename,
          mime: data.mime,
          size: data.size,
        },
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

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
          categoryId: form.categoryId,
          description: form.description,
          vendor: form.vendor || undefined,
          attachment: form.attachment || undefined,
        }),
      });
      await readOk<{ expense: Expense }>(res);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        amount: "",
        categoryId: form.categoryId,
        description: "",
        vendor: "",
        attachment: null,
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const params = new URLSearchParams();
    params.set("year", filters.year);
    params.set("month", filters.month);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    window.location.href = `/api/admin/expenses/export.csv?${params.toString()}`;
  };

  const exportXlsx = async () => {
    try {
      const { buildXlsxFromArray, downloadXlsx } = await import("@/lib/excel");

      const header = ["Дата", "Сумма ₽", "Категория", "Описание", "Подрядчик", "Вложение"];
      const rows = items.map((i) => [
        new Date(i.date).toLocaleDateString("ru-RU"),
        i.amount,
        i.categoryName,
        i.description,
        i.vendor || "",
        i.attachment?.filename || "",
      ]);

      const buffer = await buildXlsxFromArray([header, ...rows], "Расходы");
      downloadXlsx(buffer, `expenses_${filters.year}-${filters.month.padStart(2, "0")}.xlsx`);
    } catch (e) {
      setError(`Ошибка экспорта XLSX: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-zinc-700">
            Год
            <input
              type="number"
              value={filters.year}
              onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
              className="mt-1 w-28 rounded border border-zinc-300 px-2 py-1"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Месяц
            <input
              type="number"
              min={1}
              max={12}
              value={filters.month}
              onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
              className="mt-1 w-20 rounded border border-zinc-300 px-2 py-1"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Категория
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
              className="mt-1 rounded border border-zinc-300 px-2 py-1"
            >
              <option value="">Все</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={exportCsv}
            disabled={items.length === 0}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            Экспорт CSV
          </button>
          <button
            type="button"
            onClick={exportXlsx}
            disabled={items.length === 0}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            Экспорт XLSX
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Сводка по периодам</h2>
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Период</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Количество</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {summary.map((s) => (
                  <tr key={s.period}>
                    <td className="px-3 py-2">{s.period}</td>
                    <td className="px-3 py-2">{s.count}</td>
                    <td className="px-3 py-2 font-semibold">{s.total.toFixed(2)} ₽</td>
                  </tr>
                ))}
                <tr className="bg-zinc-50 font-semibold">
                  <td className="px-3 py-2">Итого</td>
                  <td className="px-3 py-2">{summary.reduce((sum, s) => sum + s.count, 0)}</td>
                  <td className="px-3 py-2">{total.toFixed(2)} ₽</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Form */}
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
              required
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
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-zinc-800">Категория</span>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
              className="rounded border border-zinc-300 px-3 py-2"
              required
            >
              <option value="">Выберите...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
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
              required
            />
          </label>
          <label className="sm:col-span-2 lg:col-span-4 flex flex-col gap-1">
            <span className="font-semibold text-zinc-800">Вложение</span>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleUpload(file);
                    e.target.value = "";
                  }
                }}
                disabled={uploading || !!form.attachment}
                className="text-sm"
              />
              {uploading && <span className="text-xs text-zinc-600">Загрузка...</span>}
              {form.attachment && (
                <div className="flex items-center gap-2">
                  <a
                    href={form.attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#5E704F] underline"
                  >
                    {form.attachment.filename}
                  </a>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, attachment: null }))}
                    className="text-xs text-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-600">PDF, JPEG, PNG, WebP, до 10 МБ</p>
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={loading || !form.categoryId}
              className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
            >
              {loading ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        </form>
        {error && <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">{error}</div>}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm text-zinc-800 mb-3">
          <div className="font-semibold">Всего расходов: {total.toFixed(2)} ₽</div>
          <div className="text-zinc-600">Период: {filters.year}-{filters.month.padStart(2, "0")}</div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Дата</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Сумма</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Категория</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Описание</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Подрядчик</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Вложение</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="px-3 py-2">{new Date(i.date).toLocaleDateString("ru-RU")}</td>
                  <td className="px-3 py-2 font-semibold">{i.amount.toFixed(2)} ₽</td>
                  <td className="px-3 py-2">{i.categoryName}</td>
                  <td className="px-3 py-2">{i.description}</td>
                  <td className="px-3 py-2">{i.vendor ?? "—"}</td>
                  <td className="px-3 py-2">
                    {i.attachment ? (
                      <a
                        href={i.attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#5E704F] underline text-xs"
                      >
                        {i.attachment.filename}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-3 py-6" colSpan={6}>
                    {loading ? (
                      <div className="text-center text-sm text-zinc-600">Загрузка...</div>
                    ) : (
                      <EmptyStateCard
                        title="Расходов пока нет"
                        description="Добавьте первый расход, используя форму ниже. Вы можете фильтровать расходы по году, месяцу и категории."
                      />
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
