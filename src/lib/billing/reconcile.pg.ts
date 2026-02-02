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

const formatPlotLabel = (plotNumber: string | null, sntStreetNumber: string | null, cityAddress: string | null) => {
  if (sntStreetNumber && plotNumber) {
    return `Линия ${sntStreetNumber}, участок ${plotNumber}`;
  }
  if (plotNumber) return `Участок ${plotNumber}`;
  if (cityAddress) return cityAddress;
  return "—";
};

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export async function getSummary(params: { period: string }) {
  const range = buildPeriodRange(params.period);
  const accruedRows = await sql<Array<{ total: number }>>`
    select coalesce(sum(amount), 0) as total
    from billing_accruals
    where period = ${params.period}
  `;
  const paidRows = await sql<Array<{ total: number }>>`
    select coalesce(sum(al.amount), 0) as total
    from billing_allocations al
    join billing_accruals a on a.id = al.accrual_id
    where a.period = ${params.period}
  `;
  const paymentsCountRows = await sql<Array<{ total: number }>>`
    select count(*)::int as total
    from billing_payments
    where paid_at >= ${range.start} and paid_at <= ${range.end}
  `;
  const debtorsRows = await sql<Array<{ total: number }>>`
    select count(*)::int as total
    from (
      select a.plot_id, (sum(a.amount) - coalesce(sum(al.amount), 0)) as remaining
      from billing_accruals a
      left join billing_allocations al on al.accrual_id = a.id
      where a.period = ${params.period}
      group by a.plot_id
    ) t
    where t.remaining > 0
  `;

  const accruedTotal = toNumber(accruedRows[0]?.total);
  const paidTotal = toNumber(paidRows[0]?.total);
  const debtTotal = Math.max(0, accruedTotal - paidTotal);
  return {
    totals: {
      accrued: accruedTotal,
      paid: paidTotal,
      debt: debtTotal,
      penalty: 0,
    },
    counts: {
      payments: paymentsCountRows[0]?.total ?? 0,
      debtors: debtorsRows[0]?.total ?? 0,
    },
  };
}

export async function listUnallocated(params: { period: string; page: number; pageSize: number }) {
  const range = buildPeriodRange(params.period);
  const page = Math.max(1, params.page);
  const pageSize = Math.min(100, Math.max(1, params.pageSize));
  const rows = await sql<
    Array<{
      id: string;
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
      p.id,
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
    where p.paid_at >= ${range.start} and p.paid_at <= ${range.end}
    group by p.id, pl.plot_number, pl.snt_street_number, pl.city_address
    having coalesce(sum(al.amount), 0) = 0
    order by p.paid_at desc nulls last
    limit ${pageSize}
    offset ${(page - 1) * pageSize}
  `;
  const items = rows.map((row: {
    id: string;
    paid_at: string | null;
    amount: number | string;
    payer: string | null;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
  }) => ({
    id: row.id,
    date: row.paid_at ?? "",
    amount: toNumber(row.amount),
    payer: row.payer ?? "—",
    plot: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
  }));
  return { items, page, pageSize };
}

export async function listOverpayments(params: { period: string; page: number; pageSize: number }) {
  const range = buildPeriodRange(params.period);
  const page = Math.max(1, params.page);
  const pageSize = Math.min(100, Math.max(1, params.pageSize));
  const rows = await sql<
    Array<{
      id: string;
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
      p.id,
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
    where p.paid_at >= ${range.start} and p.paid_at <= ${range.end}
    group by p.id, pl.plot_number, pl.snt_street_number, pl.city_address
    having (p.amount - coalesce(sum(al.amount), 0)) > 0 and coalesce(sum(al.amount), 0) > 0
    order by p.paid_at desc nulls last
    limit ${pageSize}
    offset ${(page - 1) * pageSize}
  `;
  const items = rows.map((row: {
    id: string;
    paid_at: string | null;
    amount: number | string;
    payer: string | null;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
    allocated_amount: number | string;
  }) => ({
    id: row.id,
    date: row.paid_at ?? "",
    amount: toNumber(row.amount),
    payer: row.payer ?? "—",
    plot: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
    remaining: Math.max(0, toNumber(row.amount) - toNumber(row.allocated_amount)),
  }));
  return { items, page, pageSize };
}

export async function listDebtors(params: { period: string; page: number; pageSize: number; q?: string | null }) {
  const page = Math.max(1, params.page);
  const pageSize = Math.min(100, Math.max(1, params.pageSize));
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
    limit ${pageSize}
    offset ${(page - 1) * pageSize}
  `;
  const items = rows.map((row: {
    plot_id: string;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
    accrued: number | string;
    paid: number | string;
  }) => {
    const accrued = toNumber(row.accrued);
    const paid = toNumber(row.paid);
    return {
      plotId: row.plot_id,
      plot: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
      accrued,
      paid,
      debt: Math.max(0, accrued - paid),
    };
  });
  return { items, page, pageSize };
}

export async function listBalances(params: { period?: string | null; q?: string | null; limit?: number; offset?: number }) {
  const limit = Math.min(500, Math.max(1, params.limit ?? 100));
  const offset = Math.max(0, params.offset ?? 0);
  const conditions = [] as ReturnType<typeof sql>[];
  if (params.period) {
    conditions.push(sql`a.period = ${params.period}`);
  }
  if (params.q) {
    const q = `%${params.q.toLowerCase().trim()}%`;
    conditions.push(sql`(lower(pl.plot_number) like ${q} or lower(pl.snt_street_number) like ${q} or lower(pl.city_address) like ${q})`);
  }
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const countRows = await sql<Array<{ total: number }>>`
    select count(*)::int as total
    from (
      select a.plot_id
      from billing_accruals a
      left join plots pl on pl.id = a.plot_id
      ${where}
      group by a.plot_id
    ) t
  `;
  const total = countRows[0]?.total ?? 0;

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
    ${where}
    group by a.plot_id, pl.plot_number, pl.snt_street_number, pl.city_address
    order by pl.plot_number asc nulls last, pl.snt_street_number asc nulls last
    limit ${limit}
    offset ${offset}
  `;

  const items = rows.map((row: {
    plot_id: string;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
    accrued: number | string;
    paid: number | string;
  }) => {
    const accrued = toNumber(row.accrued);
    const paid = toNumber(row.paid);
    const debt = Math.max(0, accrued - paid);
    const credit = Math.max(0, paid - accrued);
    return {
      plotId: row.plot_id,
      plotLabel: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
      debt,
      credit,
      balance: paid - accrued,
    };
  });

  return { items, total, limit, offset };
}

export async function bulkUpdateMatch(params: { ids: string[]; action: "confirm" | "review" | "unmatch" }) {
  if (!params.ids.length) return { updatedCount: 0 };
  const values = params.ids.map((value: string) => sql`${value}`);
  if (params.action === "confirm") {
    const result = await sql`
      update billing_payments
      set status = 'matched', match_status = 'matched'
      where id in (${sql.join(values, sql`, `)})
    `;
    return { updatedCount: Number(result.count ?? 0) };
  }
  if (params.action === "review") {
    const result = await sql`
      update billing_payments
      set status = 'needs_review', match_status = 'needs_review'
      where id in (${sql.join(values, sql`, `)})
    `;
    return { updatedCount: Number(result.count ?? 0) };
  }
  const result = await sql`
    update billing_payments
    set status = 'unmatched', match_status = 'unmatched', plot_id = null
    where id in (${sql.join(values, sql`, `)})
  `;
  return { updatedCount: Number(result.count ?? 0) };
}

export async function manualMatch(params: { paymentId: string; plotId: string }) {
  const result = await sql`
    update billing_payments
    set plot_id = ${params.plotId}, status = 'matched', match_status = 'matched'
    where id = ${params.paymentId}
  `;
  return { updated: Number(result.count ?? 0) > 0 };
}

export async function runAutoMatch(limit?: number) {
  const ids = typeof limit === "number"
    ? await sql<Array<{ id: string }>>`
        select p.id
        from billing_payments p
        join plots pl on pl.plot_number = p.plot_ref
        where p.plot_id is null and p.plot_ref is not null
        limit ${limit}
      `
    : await sql<Array<{ id: string }>>`
        select p.id
        from billing_payments p
        join plots pl on pl.plot_number = p.plot_ref
        where p.plot_id is null and p.plot_ref is not null
      `;
  const updateIds = ids.map((row: { id: string }) => row.id);
  let updatedCount = 0;
  if (updateIds.length) {
    const values = updateIds.map((value: string) => sql`${value}`);
    const updated = await sql`
      update billing_payments p
      set plot_id = pl.id, status = 'matched', match_status = 'matched'
      from plots pl
      where p.id in (${sql.join(values, sql`, `)})
        and pl.plot_number = p.plot_ref
    `;
    updatedCount = Number(updated.count ?? 0);
  }
  const needsReview = await sql`
    update billing_payments
    set status = 'needs_review', match_status = 'needs_review'
    where plot_id is null
  `;
  return { matched: updatedCount, needsReview: Number(needsReview.count ?? 0) };
}
