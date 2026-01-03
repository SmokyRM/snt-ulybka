import { getCollectionsAnalytics, withTotals } from "@/lib/analytics";

export const metadata = {
  alternates: {
    canonical: "/reports",
  },
};

const today = new Date();
const defaultTo = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
const defaultFrom = `${today.getUTCFullYear() - 1}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;

const formatAmount = (n: number) => `${n.toFixed(2)} ₽`;

export default function PublicReportsPage() {
  const { points, totals } = withTotals(getCollectionsAnalytics({ from: defaultFrom, to: defaultTo }).points);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Собрано по взносам</h1>
          <p className="text-sm text-zinc-700">Помесячная сводка начислений и оплат (без персональных данных).</p>
        </div>

        <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Период</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Членские</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Целевые</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Электро</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {points.map((p) => (
                <tr key={p.period}>
                  <td className="px-3 py-2 font-semibold">{p.period}</td>
                  <td className="px-3 py-2">
                    Начислено: {formatAmount(p.membership.accrued)} <br />
                    Оплачено: {formatAmount(p.membership.paid)}
                  </td>
                  <td className="px-3 py-2">
                    Начислено: {formatAmount(p.target.accrued)} <br />
                    Оплачено: {formatAmount(p.target.paid)}
                  </td>
                  <td className="px-3 py-2">
                    Начислено: {formatAmount(p.electricity.accrued)} <br />
                    Оплачено: {formatAmount(p.electricity.paid)}
                  </td>
                </tr>
              ))}
              {points.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-zinc-600" colSpan={4}>
                    Нет данных
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm">
          <p className="text-sm font-semibold text-zinc-900">Итого за период</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <div>Членские: начислено {formatAmount(totals.membership.accrued)}, оплачено {formatAmount(totals.membership.paid)}</div>
              <div>Целевые: начислено {formatAmount(totals.target.accrued)}, оплачено {formatAmount(totals.target.paid)}</div>
              <div>Электро: начислено {formatAmount(totals.electricity.accrued)}, оплачено {formatAmount(totals.electricity.paid)}</div>
            </div>
            <div className="font-semibold">
              Всего начислено: {formatAmount(totals.all.accrued)} <br />
              Оплачено: {formatAmount(totals.all.paid)} <br />
              Дебиторка: {formatAmount(totals.all.debt)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
