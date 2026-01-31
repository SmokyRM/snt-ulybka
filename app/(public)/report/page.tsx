import { buildMonthlyAggregates } from "@/lib/office/reporting";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default async function PublicReportPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const from = searchParams?.from ?? null;
  const to = searchParams?.to ?? null;
  const items = buildMonthlyAggregates(from, to);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6" data-testid="public-report-root">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Публичный отчёт СНТ</h1>
          <p className="text-sm text-zinc-600">Ежемесячные агрегированные показатели без персональных данных.</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="public-report-chart">
          <div className="text-sm font-semibold text-zinc-900">Динамика по месяцам</div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">Период</th>
                  <th className="px-3 py-2 text-right">Начислено</th>
                  <th className="px-3 py-2 text-right">Оплачено</th>
                  <th className="px-3 py-2 text-right">Долг на конец</th>
                  <th className="px-3 py-2 text-right">Платежей</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {items.map((row) => (
                  <tr key={row.period}>
                    <td className="px-3 py-2 text-zinc-700">{row.period}</td>
                    <td className="px-3 py-2 text-right text-zinc-700">{formatCurrency(row.accrued)}</td>
                    <td className="px-3 py-2 text-right text-zinc-700">{formatCurrency(row.paid)}</td>
                    <td className="px-3 py-2 text-right text-zinc-900 font-semibold">{formatCurrency(row.debtEnd)}</td>
                    <td className="px-3 py-2 text-right text-zinc-700">{row.paymentsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
