import { sql } from "@/db/client";

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatPlotLabel = (plotNumber: string | null, sntStreetNumber: string | null, cityAddress: string | null) => {
  if (sntStreetNumber && plotNumber) {
    return `Линия ${sntStreetNumber}, участок ${plotNumber}`;
  }
  if (plotNumber) return `Участок ${plotNumber}`;
  if (cityAddress) return cityAddress;
  return "—";
};

export async function buildReconciliationStatementPg(params: {
  plotId: string;
  from: string;
  to: string;
}) {
  const plotRows = await sql<
    Array<{ id: string; plot_number: string | null; snt_street_number: string | null; city_address: string | null }>
  >`
    select id, plot_number, snt_street_number, city_address
    from plots
    where id = ${params.plotId}
    limit 1
  `;
  const plot = plotRows[0];

  const accrualRows = await sql<
    Array<{ id: string; period: string; amount: number | string; created_at: string }>
  >`
    select id, period, amount, created_at::text as created_at
    from billing_accruals
    where plot_id = ${params.plotId}
      and period >= ${params.from}
      and period <= ${params.to}
    order by period asc, created_at asc
  `;

  const allocationRows = await sql<
    Array<{
      amount: number | string;
      created_at: string;
      paid_at: string | null;
    }>
  >`
    select
      al.amount,
      al.created_at::text as created_at,
      p.paid_at::text as paid_at
    from billing_allocations al
    join billing_accruals a on a.id = al.accrual_id
    left join billing_payments p on p.id = al.payment_id
    where a.plot_id = ${params.plotId}
      and a.period >= ${params.from}
      and a.period <= ${params.to}
    order by al.created_at asc
  `;

  const totalAccrued = accrualRows.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const totalPaid = allocationRows.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const debt = Math.max(0, totalAccrued - totalPaid);
  const overpay = Math.max(0, totalPaid - totalAccrued);

  const operations = [
    ...accrualRows.map((row) => ({
      type: "accrual",
      date: row.created_at,
      period: row.period,
      amount: toNumber(row.amount),
    })),
    ...allocationRows.map((row) => ({
      type: "payment",
      date: row.paid_at ?? row.created_at,
      period: null as string | null,
      amount: toNumber(row.amount),
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    plotId: params.plotId,
    plotLabel: plot ? formatPlotLabel(plot.plot_number, plot.snt_street_number, plot.city_address) : params.plotId,
    periodRange: { from: params.from, to: params.to },
    totals: { accrued: totalAccrued, paid: totalPaid, debt, overpay },
    operations,
  };
}
