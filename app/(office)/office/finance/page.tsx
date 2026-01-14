import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { listFinance } from "@/lib/finance.store";

type Props = {
  searchParams?: {
    q?: string;
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
          <span className="text-xs font-semibold text-zinc-600">Поиск по участку или имени</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
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
      </form>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <th className="px-3 py-2">Участок</th>
              <th className="px-3 py-2">Владелец</th>
              <th className="px-3 py-2 text-right">Начислено</th>
              <th className="px-3 py-2 text-right">Оплачено</th>
              <th className="px-3 py-2 text-right">Баланс</th>
              <th className="px-3 py-2">Обновлено</th>
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
