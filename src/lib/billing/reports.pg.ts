import { sql } from "@/db/client";
import {
  buildAccrualsCsv,
  buildDebtorsCsv,
  buildPaymentsCsv,
  buildUnallocatedPaymentsCsv,
  type AccrualsCsvRow,
  type DebtorsCsvRow,
  type PaymentsCsvRow,
  type UnallocatedPaymentsCsvRow,
} from "@/lib/billing/reports.csv";

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

const formatPlotLabel = (plotNumber: string | null, sntStreetNumber: string | null, cityAddress: string | null) => {
  if (sntStreetNumber && plotNumber) {
    return `Линия ${sntStreetNumber}, участок ${plotNumber}`;
  }
  if (plotNumber) return `Участок ${plotNumber}`;
  if (cityAddress) return cityAddress;
  return "";
};

const categoryTitle = (category: string | null) => {
  if (category === "membership") return "Членский взнос";
  if (category === "electricity") return "Электроэнергия";
  if (category === "target") return "Целевой взнос";
  return category ?? "";
};

const buildPeriodRange = (value?: string | null) => {
  if (!value) return null;
  const [year, month] = value.split("-");
  if (!year || !month) return null;
  const start = `${year}-${month}-01`;
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  endDate.setUTCDate(0);
  return { from: start, to: endDate.toISOString().slice(0, 10) };
};

export async function exportPaymentsCsv(params: {
  period?: string | null;
  q?: string | null;
  plotId?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(2000, Math.max(1, params.limit ?? 500));
  const offset = Math.max(0, params.offset ?? 0);
  const periodRange = buildPeriodRange(params.period);
  const effectiveFrom = periodRange?.from ?? params.from ?? null;
  const effectiveTo = periodRange?.to ?? params.to ?? null;

  const conditions = [] as ReturnType<typeof sql>[];
  if (params.q) {
    const q = `%${params.q.toLowerCase().trim()}%`;
    conditions.push(
      sql`(lower(p.payer) like ${q} or lower(coalesce(p.plot_ref, '')) like ${q} or lower(coalesce(pl.plot_number, '')) like ${q})`,
    );
  }
  if (params.plotId) {
    conditions.push(sql`p.plot_id = ${params.plotId}`);
  }
  if (effectiveFrom) {
    conditions.push(sql`p.paid_at >= ${effectiveFrom}`);
  }
  if (effectiveTo) {
    conditions.push(sql`p.paid_at <= ${effectiveTo}`);
  }
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const rows: Array<{
    id: string;
    paid_at: string | null;
    amount: number | string;
    payer: string | null;
    plot_ref: string | null;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
    allocated: number | string;
  }> = await sql<
    Array<{
      id: string;
      paid_at: string | null;
      amount: number | string;
      payer: string | null;
      plot_ref: string | null;
      plot_number: string | null;
      snt_street_number: string | null;
      city_address: string | null;
      allocated: number | string;
    }>
  >`
    select
      p.id,
      p.paid_at::text as paid_at,
      p.amount,
      p.payer,
      p.plot_ref,
      pl.plot_number,
      pl.snt_street_number,
      pl.city_address,
      coalesce(sum(al.amount), 0) as allocated
    from billing_payments p
    left join billing_allocations al on al.payment_id = p.id
    left join plots pl on pl.id = p.plot_id
    ${where}
    group by p.id, pl.plot_number, pl.snt_street_number, pl.city_address
    order by p.paid_at desc nulls last, p.created_at desc
    limit ${limit}
    offset ${offset}
  `;

  const items: PaymentsCsvRow[] = rows.map((row) => {
    const amount = typeof row.amount === "number" ? row.amount : Number(row.amount);
    const allocated = typeof row.allocated === "number" ? row.allocated : Number(row.allocated ?? 0);
    return {
      date: row.paid_at ?? "",
      amount,
      payer: row.payer ?? "",
      plot: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address) || row.plot_ref || "",
      status: allocated > 0 ? "partially_allocated" : "unallocated",
      allocated,
      remaining: Math.max(0, amount - allocated),
    };
  });

  return buildPaymentsCsv(items);
}

export async function exportAccrualsCsv(params: {
  period?: string | null;
  q?: string | null;
  category?: string | null;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(2000, Math.max(1, params.limit ?? 500));
  const offset = Math.max(0, params.offset ?? 0);
  const conditions = [] as ReturnType<typeof sql>[];
  if (params.period) {
    conditions.push(sql`a.period = ${params.period}`);
  }
  if (params.category) {
    conditions.push(sql`a.category = ${params.category}`);
  }
  if (params.q) {
    const q = `%${params.q.toLowerCase().trim()}%`;
    conditions.push(sql`(lower(pl.plot_number) like ${q} or lower(pl.snt_street_number) like ${q} or lower(pl.city_address) like ${q})`);
  }
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const rows: Array<{
    created_at: string;
    amount: number | string;
    category: string | null;
    paid_amount: number | string;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
  }> = await sql<
    Array<{
      created_at: string;
      amount: number | string;
      category: string | null;
      paid_amount: number | string;
      plot_number: string | null;
      snt_street_number: string | null;
      city_address: string | null;
    }>
  >`
    select
      a.created_at::text as created_at,
      a.amount,
      a.category,
      coalesce(sum(al.amount), 0) as paid_amount,
      pl.plot_number,
      pl.snt_street_number,
      pl.city_address
    from billing_accruals a
    left join billing_allocations al on al.accrual_id = a.id
    left join plots pl on pl.id = a.plot_id
    ${where}
    group by a.id, pl.plot_number, pl.snt_street_number, pl.city_address
    order by a.period desc, a.created_at desc
    limit ${limit}
    offset ${offset}
  `;

  const items: AccrualsCsvRow[] = rows.map((row) => {
    const amount = typeof row.amount === "number" ? row.amount : Number(row.amount);
    const paid = typeof row.paid_amount === "number" ? row.paid_amount : Number(row.paid_amount ?? 0);
    const remaining = Math.max(0, amount - paid);
    const status = paid <= 0 ? "open" : remaining > 0 ? "partially_paid" : "paid";
    return {
      date: row.created_at,
      plot: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
      title: categoryTitle(row.category),
      amount,
      paid,
      remaining,
      status,
    };
  });

  return buildAccrualsCsv(items);
}

export async function exportDebtorsCsv(params: { period: string; q?: string | null; limit?: number; offset?: number }) {
  const limit = Math.min(2000, Math.max(1, params.limit ?? 500));
  const offset = Math.max(0, params.offset ?? 0);
  const conditions = [] as ReturnType<typeof sql>[];
  if (params.q) {
    const q = `%${params.q.toLowerCase().trim()}%`;
    conditions.push(sql`(lower(pl.plot_number) like ${q} or lower(pl.snt_street_number) like ${q} or lower(pl.city_address) like ${q})`);
  }
  const where = conditions.length ? sql`and ${sql.join(conditions, sql` and `)}` : sql``;

  const rows = await sql<
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
    where a.period = ${params.period}
    ${where}
    group by a.plot_id, pl.plot_number, pl.snt_street_number, pl.city_address
    having (sum(a.amount) - coalesce(sum(al.amount), 0)) > 0
    order by (sum(a.amount) - coalesce(sum(al.amount), 0)) desc
    limit ${limit}
    offset ${offset}
  `;

  const items: DebtorsCsvRow[] = rows.map(
    (row: {
      plot_id: string;
      plot_number: string | null;
      snt_street_number: string | null;
      city_address: string | null;
      accrued: number | string;
      paid: number | string;
    }) => {
    const accrued = typeof row.accrued === "number" ? row.accrued : Number(row.accrued);
    const paid = typeof row.paid === "number" ? row.paid : Number(row.paid);
    return {
      plot: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
      resident: "—",
      charged: accrued,
      paid,
      debt: Math.max(0, accrued - paid),
    };
  });

  return buildDebtorsCsv(items);
}

export async function exportUnallocatedPaymentsCsv(params: { period?: string | null; limit?: number; offset?: number }) {
  const limit = Math.min(2000, Math.max(1, params.limit ?? 500));
  const offset = Math.max(0, params.offset ?? 0);
  const range = buildPeriodRange(params.period ?? null);
  const conditions = [] as ReturnType<typeof sql>[];
  if (range) {
    conditions.push(sql`p.paid_at >= ${range.from} and p.paid_at <= ${range.to}`);
  }
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const rows: Array<{
    paid_at: string | null;
    amount: number | string;
    payer: string | null;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
    allocated_amount: number | string;
  }> = await sql<
    Array<{
      paid_at: string | null;
      amount: number | string;
      payer: string | null;
      plot_number: string | null;
      snt_street_number: string | null;
      city_address: string | null;
      allocated_amount: number | string;
    }>
  >`
    select
      p.paid_at::text as paid_at,
      p.amount,
      p.payer,
      pl.plot_number,
      pl.snt_street_number,
      pl.city_address,
      coalesce(sum(al.amount), 0) as allocated_amount
    from billing_payments p
    left join billing_allocations al on al.payment_id = p.id
    left join plots pl on pl.id = p.plot_id
    ${where}
    group by p.id, pl.plot_number, pl.snt_street_number, pl.city_address
    having coalesce(sum(al.amount), 0) = 0
    order by p.paid_at desc nulls last
    limit ${limit}
    offset ${offset}
  `;

  const items: UnallocatedPaymentsCsvRow[] = rows.map((row) => ({
    date: row.paid_at ?? "",
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount),
    payer: row.payer ?? "",
    plot: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
    status: "unmatched",
    remaining: typeof row.amount === "number" ? row.amount : Number(row.amount),
  }));

  return buildUnallocatedPaymentsCsv(items);
}
