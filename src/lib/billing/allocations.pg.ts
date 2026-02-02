import { sql } from "@/db/client";

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

type PaymentRow = {
  id: string;
  plot_id: string | null;
  amount: number;
  paid_at: string | null;
  payer: string | null;
  allocated_amount: number;
};

type AccrualRow = {
  id: string;
  plot_id: string | null;
  period: string;
  amount: number;
  allocated_amount: number;
};

type AllocationRow = {
  id: string;
  payment_id: string;
  accrual_id: string;
  amount: number | string;
  period: string;
  paid_at: string | null;
  plot_number: string | null;
  snt_street_number: string | null;
  city_address: string | null;
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

const buildPeriodRange = (period?: string | null) => {
  if (!period) return null;
  const [year, month] = period.split("-");
  if (!year || !month) return null;
  const start = `${year}-${month}-01`;
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  endDate.setUTCDate(0);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
};

export async function getUnallocatedPayments(params?: {
  period?: string | null;
  page?: number;
  pageSize?: number;
  q?: string | null;
}) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params?.pageSize ?? 10));
  const range = buildPeriodRange(params?.period ?? null);

  const conditions = [] as ReturnType<typeof sql>[];
  if (range) {
    conditions.push(sql`p.paid_at >= ${range.start} and p.paid_at <= ${range.end}`);
  }
  if (params?.q) {
    const q = `%${params.q.toLowerCase().trim()}%`;
    conditions.push(sql`(lower(p.payer) like ${q} or lower(coalesce(pl.plot_number, '')) like ${q})`);
  }
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const countRows = await sql<{ total: number }[]>`
    select count(*)::int as total
    from billing_payments p
    left join plots pl on pl.id = p.plot_id
    ${where}
  `;
  const total = countRows[0]?.total ?? 0;

  const rows = await sql<
    Array<
      PaymentRow & {
        plot_number: string | null;
        snt_street_number: string | null;
        city_address: string | null;
      }
    >
  >`
    select
      p.id,
      p.plot_id,
      p.amount,
      p.paid_at::text as paid_at,
      p.payer,
      coalesce(sum(al.amount), 0) as allocated_amount,
      pl.plot_number,
      pl.snt_street_number,
      pl.city_address
    from billing_payments p
    left join billing_allocations al on al.payment_id = p.id
    left join plots pl on pl.id = p.plot_id
    ${where}
    group by p.id, pl.plot_number, pl.snt_street_number, pl.city_address
    order by p.paid_at asc nulls last
    limit ${pageSize}
    offset ${(page - 1) * pageSize}
  `;

  const items = rows.map((row: PaymentRow & { plot_number: string | null; snt_street_number: string | null; city_address: string | null }) => {
    const amount = toNumber(row.amount);
    const allocated = toNumber(row.allocated_amount);
    const remaining = Math.max(0, amount - allocated);
    return {
      id: row.id,
      date: row.paid_at ?? "",
      amount,
      payer: row.payer ?? "—",
      plot: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
      allocatedAmount: allocated,
      remainingAmount: remaining,
      allocationStatus: remaining <= 0 ? "allocated" : allocated > 0 ? "partially_allocated" : "unallocated",
    };
  });

  return { items, total, page, pageSize };
}

export async function listAllocations(params?: {
  period?: string | null;
  paymentId?: string | null;
  accrualId?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params?.pageSize ?? 10));
  const conditions = [] as ReturnType<typeof sql>[];
  if (params?.paymentId) {
    conditions.push(sql`al.payment_id = ${params.paymentId}`);
  }
  if (params?.accrualId) {
    conditions.push(sql`al.accrual_id = ${params.accrualId}`);
  }
  if (params?.period) {
    conditions.push(sql`a.period = ${params.period}`);
  }
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const countRows = await sql<Array<{ total: number }>>`
    select count(*)::int as total
    from billing_allocations al
    join billing_accruals a on a.id = al.accrual_id
    ${where}
  `;
  const total = countRows[0]?.total ?? 0;

  const rows = await sql<AllocationRow[]>`
    select
      al.id,
      al.payment_id,
      al.accrual_id,
      al.amount,
      a.period,
      p.paid_at::text as paid_at,
      pl.plot_number,
      pl.snt_street_number,
      pl.city_address
    from billing_allocations al
    join billing_accruals a on a.id = al.accrual_id
    join billing_payments p on p.id = al.payment_id
    left join plots pl on pl.id = p.plot_id
    ${where}
    order by a.period desc, p.paid_at desc nulls last
    limit ${pageSize}
    offset ${(page - 1) * pageSize}
  `;

  const items = rows.map((row: AllocationRow) => ({
    id: row.id,
    paymentId: row.payment_id,
    accrualId: row.accrual_id,
    amount: toNumber(row.amount),
    period: row.period,
    paymentDate: row.paid_at ?? "",
    plot: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
  }));

  return { items, total, page, pageSize };
}

export async function applyManualAllocation(paymentId: string, accrualId: string, amount: number) {
  return manualAllocate({ paymentId, accrualId, amount });
}

export async function applyAutoAllocations(params: { period?: string | null; paymentIds?: string[] | null }) {
  return autoAllocate({ period: params.period ?? null, paymentIds: params.paymentIds ?? null });
}

const listPaymentsForAllocation = async (params?: { period?: string | null; paymentIds?: string[] | null }) => {
  const range = buildPeriodRange(params?.period ?? null);
  const conditions = [] as ReturnType<typeof sql>[];
  if (params?.paymentIds?.length) {
    const values = params.paymentIds.map((value) => sql`${value}`);
    conditions.push(sql`p.id in (${sql.join(values, sql`, `)})`);
  } else if (range) {
    conditions.push(sql`p.paid_at >= ${range.start} and p.paid_at <= ${range.end}`);
  }
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;
  const rows = await sql<Array<PaymentRow>>`
    select
      p.id,
      p.plot_id,
      p.amount,
      p.paid_at::text as paid_at,
      p.payer,
      coalesce(sum(al.amount), 0) as allocated_amount
    from billing_payments p
    left join billing_allocations al on al.payment_id = p.id
    ${where}
    group by p.id
    order by p.paid_at asc nulls last
  `;
  return rows
    .map((row: PaymentRow) => ({
      ...row,
      amount: toNumber(row.amount),
      allocated_amount: toNumber(row.allocated_amount),
    }))
    .filter((row: PaymentRow) => row.plot_id && row.amount - row.allocated_amount > 0);
};

const listAccrualsForPlot = async (plotId: string) => {
  const rows = await sql<Array<AccrualRow>>`
    select
      a.id,
      a.plot_id,
      a.period,
      a.amount,
      coalesce(sum(al.amount), 0) as allocated_amount
    from billing_accruals a
    left join billing_allocations al on al.accrual_id = a.id
    where a.plot_id = ${plotId}
    group by a.id
    order by a.period asc, a.created_at asc
  `;
  return rows.map((row: AccrualRow) => ({
    ...row,
    amount: toNumber(row.amount),
    allocated_amount: toNumber(row.allocated_amount),
  }));
};

export async function getPeriodsForAutoAllocate(params?: { period?: string | null; paymentIds?: string[] | null }) {
  const payments = await listPaymentsForAllocation({
    period: params?.period ?? null,
    paymentIds: params?.paymentIds ?? null,
  });
  const plotIds = Array.from(new Set(payments.map((payment: PaymentRow) => payment.plot_id).filter(Boolean))) as string[];
  if (!plotIds.length) return [];
  const values = plotIds.map((value) => sql`${value}`);
  const rows = await sql<Array<{ period: string }>>`
    select distinct period
    from billing_accruals
    where plot_id in (${sql.join(values, sql`, `)})
  `;
  return rows.map((row: { period: string }) => row.period);
}

export async function autoAllocate(params: { period?: string | null; paymentIds?: string[] | null }) {
  const payments = await listPaymentsForAllocation({
    period: params.period ?? null,
    paymentIds: params.paymentIds ?? null,
  });
  const affectedPeriods = new Set<string>();
  let created = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await sql.begin(async (tx: any) => {
    for (const payment of payments) {
      if (!payment.plot_id) continue;
      let remaining = payment.amount - payment.allocated_amount;
      if (remaining <= 0) continue;

      const accruals = await listAccrualsForPlot(payment.plot_id);
      for (const accrual of accruals) {
        if (remaining <= 0) break;
        const accrualRemaining = accrual.amount - accrual.allocated_amount;
        if (accrualRemaining <= 0) continue;
        const allocateAmount = Math.min(remaining, accrualRemaining);
        await tx`
          insert into billing_allocations (payment_id, accrual_id, amount)
          values (${payment.id}, ${accrual.id}, ${allocateAmount})
        `;
        remaining -= allocateAmount;
        created += 1;
        affectedPeriods.add(accrual.period);
      }
    }
  });

  return { createdCount: created, periods: Array.from(affectedPeriods) };
}

export async function getAccrualPeriod(accrualId: string) {
  const rows = await sql<Array<{ period: string }>>`
    select period
    from billing_accruals
    where id = ${accrualId}
  `;
  return rows[0]?.period ?? null;
}

export async function manualAllocate(params: { paymentId: string; accrualId: string; amount: number }) {
  const paymentRows = await sql<Array<{ id: string; plot_id: string | null; amount: number; allocated_amount: number }>>`
    select
      p.id,
      p.plot_id,
      p.amount,
      coalesce(sum(al.amount), 0) as allocated_amount
    from billing_payments p
    left join billing_allocations al on al.payment_id = p.id
    where p.id = ${params.paymentId}
    group by p.id
  `;
  const payment = paymentRows[0];
  if (!payment) throw new Error("Платёж не найден");
  const paymentRemaining = toNumber(payment.amount) - toNumber(payment.allocated_amount);

  const accrualRows = await sql<Array<{ id: string; plot_id: string | null; period: string; amount: number; allocated_amount: number }>>`
    select
      a.id,
      a.plot_id,
      a.period,
      a.amount,
      coalesce(sum(al.amount), 0) as allocated_amount
    from billing_accruals a
    left join billing_allocations al on al.accrual_id = a.id
    where a.id = ${params.accrualId}
    group by a.id
  `;
  const accrual = accrualRows[0];
  if (!accrual) throw new Error("Начисление не найдено");
  const accrualRemaining = toNumber(accrual.amount) - toNumber(accrual.allocated_amount);

  if (params.amount <= 0 || params.amount > paymentRemaining || params.amount > accrualRemaining) {
    throw new Error("Сумма превышает остаток");
  }

  const inserted = await sql<Array<{ id: string }>>`
    insert into billing_allocations (payment_id, accrual_id, amount)
    values (${params.paymentId}, ${params.accrualId}, ${params.amount})
    returning id
  `;

  return { allocationId: inserted[0]?.id ?? null, period: accrual.period };
}

export async function getPeriodsByPayment(paymentId: string) {
  const rows = await sql<Array<{ period: string }>>`
    select a.period
    from billing_allocations al
    join billing_accruals a on a.id = al.accrual_id
    where al.payment_id = ${paymentId}
  `;
  return rows.map((row: { period: string }) => row.period);
}

export async function getPeriodByAllocation(allocationId: string) {
  const rows = await sql<Array<{ period: string }>>`
    select a.period
    from billing_allocations al
    join billing_accruals a on a.id = al.accrual_id
    where al.id = ${allocationId}
  `;
  return rows[0]?.period ?? null;
}

export async function unapplyAllocation(params: { allocationId: string }) {
  const rows = await sql<Array<{ period: string }>>`
    select a.period
    from billing_allocations al
    join billing_accruals a on a.id = al.accrual_id
    where al.id = ${params.allocationId}
  `;
  const period = rows[0]?.period ?? null;
  const removed = await sql`delete from billing_allocations where id = ${params.allocationId}`;
  return { removed: Number(removed.count ?? 0) > 0, period };
}

export async function unapplyAllocationsByPayment(params: { paymentId: string }) {
  const rows = await sql<Array<{ period: string }>>`
    select a.period
    from billing_allocations al
    join billing_accruals a on a.id = al.accrual_id
    where al.payment_id = ${params.paymentId}
  `;
  const periods = rows.map((row: { period: string }) => row.period);
  const removed = await sql`delete from billing_allocations where payment_id = ${params.paymentId}`;
  return { removedCount: Number(removed.count ?? 0), periods };
}
