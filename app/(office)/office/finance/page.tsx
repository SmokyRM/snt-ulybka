import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { listDebtRows } from "@/lib/office/finance.server";
import type { DebtRow } from "@/lib/office/types";
import { hasPermission, isOfficeRole } from "@/lib/rbac";
import ExportButton from "./ExportButton";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

const normalizeRows = (rows: DebtRow[]) =>
  rows.sort((a, b) => {
    if (a.period === b.period) return a.plotNumber.localeCompare(b.plotNumber);
    return a.period < b.period ? 1 : -1;
  });

export default async function OfficeFinancePage({ searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/finance");
  }
  const role = user.role ?? "resident";
  if (!isOfficeRole(role)) {
    redirect("/forbidden");
  }
  if (!hasPermission(role, "finance.view")) {
    redirect("/forbidden");
  }

  const params = (await searchParams) ?? {};
  const q = typeof params.q === "string" ? params.q : "";
  const period = typeof params.period === "string" ? params.period : "all";

  const rows = normalizeRows(await listDebtRows({ q, period }));
  const periodOptions = Array.from(new Set(rows.map((row) => row.period))).sort().reverse();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-finance-root">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Финансы</h1>
          <p className="text-sm text-zinc-600">Долги и оплаты по участкам.</p>
        </div>
        {hasPermission(role, "finance.export") ? <ExportButton rows={rows} /> : null}
      </div>

      <form className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-3">
        <label className="sm:col-span-2">
          <span className="text-xs font-semibold text-zinc-600">Поиск по участку или имени</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            placeholder="Например: Березовая"
            data-testid="office-finance-search"
          />
        </label>
        <label>
          <span className="text-xs font-semibold text-zinc-600">Период</span>
          <select
            name="period"
            defaultValue={period}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
          >
            <option value="all">Все периоды</option>
            {periodOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
          >
            Применить
          </button>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200" data-testid="office-finance-table">
          <thead className="bg-zinc-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <th className="px-3 py-2">Участок</th>
              <th className="px-3 py-2">Владелец</th>
              <th className="px-3 py-2">Период</th>
              <th className="px-3 py-2 text-right">Начислено</th>
              <th className="px-3 py-2 text-right">Оплачено</th>
              <th className="px-3 py-2 text-right">Долг</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-sm text-zinc-600">
                  Данных по выбранным фильтрам нет.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.plotNumber}-${row.period}`} data-testid={`office-finance-row-${row.plotNumber.replace(/\s+/g, "-")}`}>
                  <td className="px-3 py-2 text-sm font-semibold text-zinc-900">{row.plotNumber}</td>
                  <td className="px-3 py-2 text-sm text-zinc-700">{row.ownerName ?? "—"}</td>
                  <td className="px-3 py-2 text-sm text-zinc-700">{row.period}</td>
                  <td className="px-3 py-2 text-right text-sm text-zinc-700">{formatCurrency(row.accrued)}</td>
                  <td className="px-3 py-2 text-right text-sm text-zinc-700">{formatCurrency(row.paid)}</td>
                  <td
                    className={`px-3 py-2 text-right text-sm font-semibold ${
                      row.debt > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {row.debt > 0 ? `-${formatCurrency(row.debt)}` : formatCurrency(0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
