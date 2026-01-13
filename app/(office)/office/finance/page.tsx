import { redirect } from "next/navigation";
<<<<<<< HEAD
import { getEffectiveSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { getOfficeSummary, listDebts } from "@/lib/billing.store";
=======
import Link from "next/link";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { listFinance } from "@/lib/finance.store";
>>>>>>> 737c5be (codex snapshot)

type Props = {
  searchParams?: {
    q?: string;
<<<<<<< HEAD
  };
};

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;

export default async function OfficeFinancePage({ searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/finance");
  const rawRole = user.role as import("@/lib/rbac").Role | "user" | "board" | undefined;
  const { canAccess, getForbiddenReason } = await import("@/lib/rbac");
  const normalizedRole: import("@/lib/rbac").Role =
    rawRole === "user" || rawRole === "board"
      ? "resident"
      : rawRole ?? "guest";

  // Guard: office.access
  if (!canAccess(normalizedRole, "office.access")) {
    const reason = getForbiddenReason(normalizedRole, "office.access");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/finance")}`);
  }

  // Guard: office.finance.view
  if (!canAccess(normalizedRole, "office.finance.view")) {
    const reason = getForbiddenReason(normalizedRole, "office.finance.view");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/finance")}`);
  }

  // UI permissions - finance is read-only (only view permission exists)
  const canView = canAccess(normalizedRole, "office.finance.view");

  const q = searchParams?.q ?? "";
  const summary = getOfficeSummary();
  const rows = listDebts({ q });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-finance-root">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-zinc-900">Финансы</h1>
        <p className="text-sm text-zinc-600">Долги и оплаты по участкам (мок-данные).</p>
        {canView ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="office-finance-readonly-hint">
            Только просмотр
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
          <div className="text-xs text-zinc-500">Суммарный долг</div>
          <div className="text-lg font-semibold text-rose-600">{formatCurrency(summary.totalDebt)}</div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
          <div className="text-xs text-zinc-500">Должников</div>
          <div className="text-lg font-semibold text-zinc-900">{summary.debtorsCount}</div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
          <div className="text-xs text-zinc-500">Оплачено за 30 дней</div>
          <div className="text-lg font-semibold text-emerald-700">{formatCurrency(summary.collected30d)}</div>
        </div>
      </div>

      <form className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:flex sm:items-end sm:gap-3">
        <label className="sm:flex-1">
=======
    debtors?: string;
  };
};

export default async function OfficeFinancePage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/office/finance");
  const role = (user?.role as Role | undefined) ?? "resident";
  if (!can(role === "admin" ? "chairman" : role, "office.finance.manage")) {
    redirect("/forbidden");
  }
  const q = searchParams?.q ?? "";
  const debtorsOnly = searchParams?.debtors === "1";
  const rows = listFinance({ q, debtorsOnly });
  const queryString = new URLSearchParams();
  if (q) queryString.set("q", q);
  if (debtorsOnly) queryString.set("debtors", "1");
  const exportHref = `/office/finance/export.csv${queryString.toString() ? `?${queryString.toString()}` : ""}`;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-finance-root">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Финансы</h1>
          <p className="text-sm text-zinc-600">Начисления и оплатa по участкам.</p>
        </div>
        <Link
          href={exportHref}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-[#5E704F] transition hover:border-[#5E704F] hover:text-[#5E704F]"
          data-testid="finance-export-csv"
        >
          Экспорт CSV
        </Link>
      </div>

      <form className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-3">
        <label className="sm:col-span-2">
>>>>>>> 737c5be (codex snapshot)
          <span className="text-xs font-semibold text-zinc-600">Поиск по участку или имени</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
<<<<<<< HEAD
            data-testid="office-finance-search"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            placeholder="Например: Берёзовая"
          />
        </label>
        <button
          type="submit"
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41] sm:mt-0"
        >
          Применить
        </button>
=======
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            placeholder="Например: Березовая"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="debtors"
            value="1"
            defaultChecked={debtorsOnly}
            className="h-4 w-4 rounded border-zinc-300 text-[#5E704F] focus:ring-[#5E704F]"
          />
          Только с долгом
        </label>
        <div className="sm:col-span-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
          >
            Применить
          </button>
        </div>
>>>>>>> 737c5be (codex snapshot)
      </form>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <th className="px-3 py-2">Участок</th>
<<<<<<< HEAD
              <th className="px-3 py-2">Житель</th>
              <th className="px-3 py-2 text-right">Начислено</th>
              <th className="px-3 py-2 text-right">Оплачено</th>
              <th className="px-3 py-2 text-right">Долг</th>
=======
              <th className="px-3 py-2">Владелец</th>
              <th className="px-3 py-2 text-right">Начислено</th>
              <th className="px-3 py-2 text-right">Оплачено</th>
              <th className="px-3 py-2 text-right">Баланс</th>
              <th className="px-3 py-2">Обновлено</th>
>>>>>>> 737c5be (codex snapshot)
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {rows.length === 0 ? (
              <tr>
<<<<<<< HEAD
                <td colSpan={5} className="px-3 py-4 text-sm text-zinc-600">
=======
                <td colSpan={6} className="px-3 py-4 text-sm text-zinc-600">
>>>>>>> 737c5be (codex snapshot)
                  Данных по выбранным фильтрам нет.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
<<<<<<< HEAD
                <tr key={row.key} data-testid={`office-finance-row-${row.key}`}>
                  <td className="px-3 py-2 text-sm font-semibold text-zinc-900">{row.plotId}</td>
                  <td className="px-3 py-2 text-sm text-zinc-700">{row.residentName}</td>
                  <td className="px-3 py-2 text-right text-sm text-zinc-700">{formatCurrency(row.chargedTotal)}</td>
                  <td className="px-3 py-2 text-right text-sm text-zinc-700">{formatCurrency(row.paidTotal)}</td>
                  <td
                    className={`px-3 py-2 text-right text-sm font-semibold ${
                      row.debt > 0 ? "text-rose-600" : row.debt < 0 ? "text-emerald-600" : "text-zinc-700"
                    }`}
                  >
                    {formatCurrency(row.debt)}
=======
                <tr key={row.plotNumber}>
                  <td className="px-3 py-2 text-sm font-semibold text-zinc-900">{row.plotNumber}</td>
                  <td className="px-3 py-2 text-sm text-zinc-700">{row.ownerName ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-sm text-zinc-700">{row.accrued.toLocaleString("ru-RU")} ₽</td>
                  <td className="px-3 py-2 text-right text-sm text-zinc-700">{row.paid.toLocaleString("ru-RU")} ₽</td>
                  <td
                    className={`px-3 py-2 text-right text-sm font-semibold ${
                      row.balance < 0 ? "text-rose-600" : row.balance > 0 ? "text-emerald-600" : "text-zinc-700"
                    }`}
                  >
                    {row.balance.toLocaleString("ru-RU")} ₽
                  </td>
                  <td className="px-3 py-2 text-sm text-zinc-600">
                    {new Date(row.updatedAt).toLocaleDateString("ru-RU")}
>>>>>>> 737c5be (codex snapshot)
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
