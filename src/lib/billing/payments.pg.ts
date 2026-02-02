import { sql } from "@/db/client";

export type PgPaymentRow = {
  id: string;
  plotId: string | null;
  plotRef: string | null;
  plotLabel: string | null;
  amount: number;
  paidAt: string | null;
  payer: string | null;
  purpose: string | null;
  status: string | null;
  matchStatus: string | null;
};

export type PgPaymentInsert = {
  plotId?: string | null;
  plotNumber?: string | null;
  paidAt: string;
  amount: number;
  payer?: string | null;
  purpose?: string | null;
  status?: string | null;
  matchStatus?: string | null;
  source?: string | null;
  externalId?: string | null;
  rawRowHash?: string | null;
};

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

const formatPlotLabel = (plotNumber: string | null, sntStreetNumber: string | null, cityAddress: string | null) => {
  if (sntStreetNumber && plotNumber) {
    return `Линия ${sntStreetNumber}, участок ${plotNumber}`;
  }
  if (plotNumber) return `Участок ${plotNumber}`;
  if (cityAddress) return cityAddress;
  return null;
};

export async function listPayments(params?: {
  q?: string | null;
  status?: string | null;
  matchStatus?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<{ items: PgPaymentRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params?.pageSize ?? 10));

  const conditions = [] as ReturnType<typeof sql>[];
  if (params?.q) {
    const q = `%${params.q.toLowerCase().trim()}%`;
    conditions.push(
      sql`(lower(p.payer) like ${q} or lower(coalesce(p.plot_ref, '')) like ${q} or lower(coalesce(pl.plot_number, '')) like ${q})`,
    );
  }
  if (params?.status) {
    conditions.push(sql`p.status = ${params.status}`);
  }
  if (params?.matchStatus) {
    conditions.push(sql`p.match_status = ${params.matchStatus}`);
  }
  if (params?.from) {
    conditions.push(sql`p.paid_at >= ${params.from}`);
  }
  if (params?.to) {
    conditions.push(sql`p.paid_at <= ${params.to}`);
  }

  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const countRows = await sql<{ total: number }[]>`
    select count(*)::int as total
    from billing_payments p
    left join plots pl on pl.id = p.plot_id
    ${where}
  `;
  const total = countRows[0]?.total ?? 0;

  const rows: Array<{
    id: string;
    plot_id: string | null;
    plot_ref: string | null;
    amount: string | number;
    paid_at: string | null;
    payer: string | null;
    purpose: string | null;
    status: string | null;
    match_status: string | null;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
  }> = await sql<{
    id: string;
    plot_id: string | null;
    plot_ref: string | null;
    amount: string | number;
    paid_at: string | null;
    payer: string | null;
    purpose: string | null;
    status: string | null;
    match_status: string | null;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
  }[]>`
    select
      p.id,
      p.plot_id,
      p.plot_ref,
      p.amount,
      p.paid_at::text as paid_at,
      p.payer,
      p.purpose,
      p.status,
      p.match_status,
      pl.plot_number,
      pl.snt_street_number,
      pl.city_address
    from billing_payments p
    left join plots pl on pl.id = p.plot_id
    ${where}
    order by p.paid_at desc nulls last, p.created_at desc
    limit ${pageSize}
    offset ${(page - 1) * pageSize}
  `;

  const items = rows.map((row) => ({
    id: row.id,
    plotId: row.plot_id,
    plotRef: row.plot_ref,
    plotLabel: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address) ?? row.plot_ref,
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount),
    paidAt: row.paid_at,
    payer: row.payer,
    purpose: row.purpose,
    status: row.status,
    matchStatus: row.match_status,
  }));

  return { items, total, page, pageSize };
}

export async function getPaymentAllocationSummary(paymentIds: string[]) {
  if (!paymentIds.length) return new Map<string, number>();
  const values = paymentIds.map((value: string) => sql`${value}`);
  const rows = await sql<Array<{ payment_id: string; allocated: number | string }>>`
    select payment_id, coalesce(sum(amount), 0) as allocated
    from billing_allocations
    where payment_id in (${sql.join(values, sql`, `)})
    group by payment_id
  `;
  const map = new Map<string, number>();
  rows.forEach((row: { payment_id: string; allocated: number | string }) => {
    const allocated = typeof row.allocated === "number" ? row.allocated : Number(row.allocated);
    map.set(row.payment_id, allocated);
  });
  return map;
}

export async function insertPayments(rows: PgPaymentInsert[]): Promise<{ inserted: number; skipped: number }> {
  if (rows.length === 0) return { inserted: 0, skipped: 0 };

  const plotNumbers = Array.from(
    new Set(
      rows
        .map((row) => row.plotNumber?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const plotMap = new Map<string, string>();
  if (plotNumbers.length) {
  const plotNumberValues = plotNumbers.map((value: string) => sql`${value}`);
  const plotRows: Array<{ id: string; plot_number: string }> = await sql<{ id: string; plot_number: string }[]>`
      select id, plot_number
      from plots
      where plot_number in (${sql.join(plotNumberValues, sql`, `)})
    `;
    plotRows.forEach((row) => plotMap.set(row.plot_number, row.id));
  }

  const payload = rows.map((row) => {
    const normalizedPlot = row.plotNumber?.trim() ?? null;
    const plotId = row.plotId ?? (normalizedPlot ? plotMap.get(normalizedPlot) ?? null : null);
    const status = row.status ?? (plotId ? "matched" : "unmatched");
    const matchStatus = row.matchStatus ?? (plotId ? "matched" : "unmatched");
    return {
      plot_id: plotId,
      plot_ref: normalizedPlot,
      amount: row.amount,
      paid_at: row.paidAt,
      payer: row.payer ?? null,
      purpose: row.purpose ?? null,
      status,
      match_status: matchStatus,
      source: row.source ?? "import",
      external_id: row.externalId ?? null,
      raw_row_hash: row.rawRowHash ?? null,
    };
  });

  const insertedRows: Array<{ id: string }> = await sql<{ id: string }[]>`
    insert into billing_payments ${sql(
      payload,
      "plot_id",
      "plot_ref",
      "amount",
      "paid_at",
      "payer",
      "purpose",
      "status",
      "match_status",
      "source",
      "external_id",
      "raw_row_hash",
    )}
    on conflict do nothing
    returning id
  `;

  const inserted = insertedRows.length;
  const skipped = payload.length - inserted;
  return { inserted, skipped };
}
