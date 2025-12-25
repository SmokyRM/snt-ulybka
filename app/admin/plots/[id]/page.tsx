import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { listPlots } from "@/lib/plotsDb";
import { listPayments, listAccrualItems, listAccrualPeriods } from "@/lib/mockDb";
import { membershipLabel } from "@/lib/membershipLabels";

export default async function PlotDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");

  const { id } = await params;
  const plot = listPlots().find((p) => p.id === id);
  if (!plot) {
    redirect("/admin/plots");
  }

  const payments = listPayments({ plotId: plot.id, includeVoided: false });
  const accrualPeriods = listAccrualPeriods();
  const accruals = listAccrualItemsForPlot(plot.id, listAccrualItems, accrualPeriods);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Участок {plot.street}, {plot.plotNumber}</h1>
        <Link
          href="/admin/plots"
          className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
        >
          Назад
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Профиль</h2>
          <p className="text-sm text-zinc-700">Улица: {plot.street}</p>
          <p className="text-sm text-zinc-700">Участок: {plot.plotNumber}</p>
          <p className="text-sm text-zinc-700">ФИО: {plot.ownerFullName ?? "—"}</p>
          <p className="text-sm text-zinc-700">Телефон: {plot.phone ?? "—"}</p>
          <p className="text-sm text-zinc-700">Email: {plot.email ?? "—"}</p>
          <p className="text-sm text-zinc-700">Членство: {membershipLabel(plot.membershipStatus)}</p>
          <p className="text-sm text-zinc-700">Подтверждён: {plot.isConfirmed ? "Да" : "Нет"}</p>
        </div>

        <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Начисления (read-only)</h2>
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Период</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Тип</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {accruals.map((a) => {
                  const period = accrualPeriods.find((p) => p.id === a.periodId);
                  const periodLabel = period ? `${period.year}-${String(period.month).padStart(2, "0")}` : "—";
                  return (
                    <tr key={a.id}>
                      <td className="px-3 py-2">{periodLabel}</td>
                      <td className="px-3 py-2">{period?.type ?? "—"}</td>
                      <td className="px-3 py-2">{a.amountAccrued.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {accruals.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center text-zinc-600" colSpan={3}>
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Платежи (read-only)</h2>
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Дата</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Сумма</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Категория</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Комментарий</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">{p.paidAt}</td>
                  <td className="px-3 py-2">{p.amount.toFixed(2)}</td>
                  <td className="px-3 py-2">{p.category ?? "—"}</td>
                  <td className="px-3 py-2">{p.comment ?? "—"}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-zinc-600" colSpan={4}>
                    Нет платежей
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

const listAccrualItemsForPlot = (
  plotId: string,
  listAccrualItemsFn: typeof listAccrualItems,
  periods: ReturnType<typeof listAccrualPeriods>
) => {
  const items = periods.flatMap((p) => listAccrualItemsFn(p.id)).filter((i) => i.plotId === plotId);
  return items.sort((a, b) => {
    const pa = periods.find((p) => p.id === a.periodId);
    const pb = periods.find((p) => p.id === b.periodId);
    if (pa && pb) {
      if (pa.year === pb.year) return pb.month - pa.month;
      return pb.year - pa.year;
    }
    return 0;
  });
};
