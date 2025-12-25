import { use } from "react";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { listAccrualPeriods, listAccrualItems, listPayments, listPlots, createAccrualPeriod } from "@/lib/mockDb";
import { categoryForAccrualType } from "@/lib/paymentCategory";

async function createPeriodAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const type = (formData.get("type") as string) || "membership_fee";
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return;
  }
  createAccrualPeriod({ year, month, type });
}

export default function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = use(searchParams);
  const user = use(getSessionUser());
  if (!isAdmin(user)) {
    redirect("/login");
  }

  const typeParam = typeof params.type === "string" ? params.type : "membership_fee";
  const periods = listAccrualPeriods().filter((p) => p.type === typeParam);
  const plots = listPlots();

  const rows = periods.map((p) => {
    const items = listAccrualItems(p.id);
    const payments = listPayments({
      periodId: p.id,
      includeVoided: false,
      category: categoryForAccrualType(p.type),
    });
    const itemsDetailed = items.map((i) => {
      const plot = plots.find((pl) => pl.id === i.plotId);
      const paid = payments.filter((pay) => pay.plotId === i.plotId).reduce((s, pay) => s + pay.amount, 0);
      return {
        ...i,
        street: plot?.street ?? "",
        plotNumber: plot?.plotNumber ?? "",
        amountPaid: paid,
        debt: i.amountAccrued - paid,
      };
    });
    return { period: p, items: itemsDetailed };
  });

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Биллинг</h1>
          <a
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </a>
        </div>

        <form action={createPeriodAction} className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <label className="text-sm text-zinc-700">
            Тип периода
            <select name="type" defaultValue={typeParam} className="mt-1 w-48 rounded border border-zinc-300 px-3 py-2 text-sm">
              <option value="membership_fee">Членские взносы</option>
              <option value="electricity">Электроэнергия</option>
              <option value="target_fee">Целевые взносы</option>
            </select>
          </label>
          <label className="text-sm text-zinc-700">
            Год
            <input
              type="number"
              name="year"
              defaultValue={new Date().getFullYear()}
              className="mt-1 w-24 rounded border border-zinc-300 px-2 py-1"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Месяц
            <input
              type="number"
              name="month"
              defaultValue={new Date().getMonth() + 1}
              min={1}
              max={12}
              className="mt-1 w-20 rounded border border-zinc-300 px-2 py-1"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42]"
          >
            Создать период
          </button>
        </form>

        {rows.map(({ period, items }) => (
          <div key={period.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-zinc-800">
                Период: {period.year}-{String(period.month).padStart(2, "0")} · Тип: {period.type}
              </div>
            </div>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Начислено</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Оплачено</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Долг</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2">
                        {i.street}, {i.plotNumber}
                      </td>
                      <td className="px-3 py-2">{i.amountAccrued.toFixed(2)}</td>
                      <td className="px-3 py-2">{i.amountPaid.toFixed(2)}</td>
                      <td className="px-3 py-2">{i.debt.toFixed(2)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-center text-zinc-600" colSpan={4}>
                        Нет начислений
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm">
            Периоды не созданы.
          </div>
        )}
      </div>
    </main>
  );
}
