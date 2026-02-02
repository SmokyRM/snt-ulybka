export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { listAccrualsWithStatus } from "@/lib/billing.store";
import { hasPgConnection, listAccruals as listAccrualsPg } from "@/lib/billing/accruals.pg";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

type AccrualRow = {
  id: string;
  date: string;
  plotId: string;
  plot: string;
  title: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  status: string;
};

export default async function OfficeBillingAccrualsPage({
  searchParams,
}: {
  searchParams?: { period?: string; page?: string; limit?: string; q?: string; category?: string };
}) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/accruals");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  try {
    assertCan(role, "finance.read", "finance");
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const period = searchParams?.period ?? defaultPeriod;
  const q = searchParams?.q ?? "";
  const category = searchParams?.category ?? "";
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const limit = Math.min(50, Math.max(5, Number(searchParams?.limit ?? "10") || 10));

  let rows: AccrualRow[] = [];
  let total = 0;

  if (hasPgConnection()) {
    const data = await listAccrualsPg({
      period: period || null,
      q: q || null,
      category: category || null,
      page,
      pageSize: limit,
    });
    rows = data.items;
    total = data.total;
  } else {
    const all = listAccrualsWithStatus()
      .filter((row) => (period ? row.period === period : true))
      .filter((row) => (category ? row.category === category : true))
      .filter((row) => (q ? `${row.plotId} ${row.title}`.toLowerCase().includes(q.toLowerCase()) : true))
      .map((row) => ({
        id: row.id,
        date: row.date,
        plotId: row.plotId,
        plot: row.plotId,
        title: row.title,
        amount: row.amount,
        paidAmount: row.paidAmount ?? 0,
        remaining: row.remaining ?? 0,
        status: row.status ?? "open",
      }));
    total = all.length;
    const start = (page - 1) * limit;
    rows = all.slice(start, start + limit);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const buildUrl = (nextPageValue: number) => {
    const params = new URLSearchParams();
    if (period) params.set("period", period);
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (nextPageValue > 1) params.set("page", String(nextPageValue));
    params.set("limit", String(limit));
    return `/office/billing/accruals?${params.toString()}`;
  };

  const exportParams = new URLSearchParams();
  if (period) exportParams.set("period", period);
  if (q) exportParams.set("q", q);
  exportParams.set("limit", String(limit));
  exportParams.set("offset", String((page - 1) * limit));
  const exportUrl = `/api/office/billing/reports/accruals.csv?${exportParams.toString()}`;

  return (
    <div className="space-y-4" data-testid="office-billing-accruals-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Начисления</h1>
        <p className="text-sm text-zinc-600">Последние начисления по участкам.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold text-zinc-700">
            Период
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-zinc-700">
            Категория
            <select
              name="category"
              defaultValue={category}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              <option value="membership">Членские</option>
              <option value="electricity">Электро</option>
              <option value="target">Целевые</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-zinc-700">
            Поиск
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Участок или тип"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-700"
          >
            Применить
          </button>
          <a
            href={exportUrl}
            className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-700"
          >
            Скачать CSV
          </a>
        </form>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
            Начислений пока нет.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">Дата</th>
                  <th className="px-3 py-2 text-left">Участок</th>
                  <th className="px-3 py-2 text-left">Тип</th>
                  <th className="px-3 py-2 text-right">Начислено</th>
                  <th className="px-3 py-2 text-right">Оплачено</th>
                  <th className="px-3 py-2 text-right">Остаток</th>
                  <th className="px-3 py-2 text-left">Статус</th>
                  <th className="px-3 py-2 text-left">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {rows.map((row) => (
                  <tr key={row.id} data-testid={`office-billing-accruals-row-${row.id}`}>
                    <td className="px-3 py-2 text-zinc-700">{new Date(row.date).toLocaleDateString("ru-RU")}</td>
                    <td className="px-3 py-2 text-zinc-900">{row.plot}</td>
                    <td className="px-3 py-2 text-zinc-700">{row.title}</td>
                    <td className="px-3 py-2 text-right font-semibold text-zinc-900">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-700">{formatCurrency(row.paidAmount ?? 0)}</td>
                    <td className="px-3 py-2 text-right text-zinc-700">{formatCurrency(row.remaining ?? 0)}</td>
                    <td className="px-3 py-2 text-zinc-700">{row.status}</td>
                    <td className="px-3 py-2 text-zinc-700">
                      <a
                        href={`/office/billing/allocate`}
                        className="rounded border border-zinc-200 px-2 py-1 text-xs"
                      >
                        Распределения
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
          <span>
            Всего: {total} • Стр. {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            <a
              href={buildUrl(prevPage)}
              className="rounded border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
            >
              Назад
            </a>
            <a
              href={buildUrl(nextPage)}
              className="rounded border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
            >
              Вперёд
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
