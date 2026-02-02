import { sql } from "@/db/client";

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

const buildPeriodRange = (period: string) => {
  const [year, month] = period.split("-");
  const start = `${year}-${month}-01`;
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  endDate.setUTCDate(0);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
};

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

export async function buildMonthlyReportPg(period: string) {
  const range = buildPeriodRange(period);
  const accruedRows = await sql<Array<{ total: number }>>`
    select coalesce(sum(amount), 0) as total
    from billing_accruals
    where period = ${period}
  `;
  const paidRows = await sql<Array<{ total: number }>>`
    select coalesce(sum(al.amount), 0) as total
    from billing_allocations al
    join billing_accruals a on a.id = al.accrual_id
    where a.period = ${period}
  `;
  const paymentsCountRows = await sql<Array<{ total: number }>>`
    select count(*)::int as total
    from billing_payments
    where paid_at >= ${range.start} and paid_at <= ${range.end}
  `;
  const penaltyRows = await sql<Array<{ total: number }>>`
    select coalesce(sum(amount), 0) as total
    from billing_penalty_accruals
    where period = ${period} and status = 'active'
  `;
  const debtorsRows = await sql<
    Array<{
      plot_id: string;
      plot_number: string | null;
      snt_street_number: string | null;
      city_address: string | null;
      accrued: number | string;
      paid: number | string;
    }>
  >`
    select
      a.plot_id,
      pl.plot_number,
      pl.snt_street_number,
      pl.city_address,
      sum(a.amount) as accrued,
      coalesce(sum(al.amount), 0) as paid
    from billing_accruals a
    left join billing_allocations al on al.accrual_id = a.id
    left join plots pl on pl.id = a.plot_id
    where a.period = ${period}
    group by a.plot_id, pl.plot_number, pl.snt_street_number, pl.city_address
    having (sum(a.amount) - coalesce(sum(al.amount), 0)) > 0
    order by (sum(a.amount) - coalesce(sum(al.amount), 0)) desc
    limit 20
  `;

  const accrued = toNumber(accruedRows[0]?.total);
  const paid = toNumber(paidRows[0]?.total);
  const penalty = toNumber(penaltyRows[0]?.total);
  const debt = Math.max(0, accrued - paid);
  const paymentsCount = paymentsCountRows[0]?.total ?? 0;
  const debtors = debtorsRows.map((row: {
    plot_id: string;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
    accrued: number | string;
    paid: number | string;
  }) => {
    const accruedAmount = toNumber(row.accrued);
    const paidAmount = toNumber(row.paid);
    return {
      plotLabel: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
      debt: Math.max(0, accruedAmount - paidAmount),
    };
  });

  return {
    period,
    totals: {
      accrued,
      paid,
      debt,
      penalty,
    },
    paymentsCount,
    debtors,
  };
}
