"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TargetFund } from "@/types/snt";
import { readOk } from "@/lib/api/client";

type Props = {
  initialData?: TargetFund;
};

export default function TargetFundFormClient({ initialData }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    targetAmount: initialData?.targetAmount?.toString() || "",
    deadline: initialData?.deadline ? new Date(initialData.deadline).toISOString().slice(0, 10) : "",
    status: initialData?.status || "active",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = initialData ? "/api/admin/targets" : "/api/admin/targets";
      const method = initialData ? "PUT" : "POST";
      const body = {
        ...(initialData ? { id: initialData.id } : {}),
        title: form.title.trim(),
        description: form.description.trim(),
        targetAmount: Number(form.targetAmount),
        deadline: form.deadline || null,
        status: form.status,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await readOk<{ fund: TargetFund }>(res);

      router.push(`/admin/targets/${data.fund.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message || "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-800">Название *</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded border border-zinc-300 px-3 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-800">Описание</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={4}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">Целевая сумма (₽) *</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.targetAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, targetAmount: e.target.value }))}
              className="rounded border border-zinc-300 px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">Срок (дата)</span>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-800">Статус</span>
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as TargetFund["status"] }))}
            className="rounded border border-zinc-300 px-3 py-2"
          >
            <option value="active">Активная</option>
            <option value="completed">Завершена</option>
            <option value="archived">Архив</option>
          </select>
        </label>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
          >
            {loading ? "Сохраняем..." : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
