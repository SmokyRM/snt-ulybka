import { sql } from "@/db/client";
import { getElectricityTariff, getMembershipFee } from "@/lib/billing.store";

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

type PlotRow = {
  id: string;
  plot_number: string | null;
  snt_street_number: string | null;
  city_address: string | null;
};

const formatPlotLabel = (plotNumber: string | null, sntStreetNumber: string | null, cityAddress: string | null) => {
  if (sntStreetNumber && plotNumber) {
    return `Линия ${sntStreetNumber}, участок ${plotNumber}`;
  }
  if (plotNumber) return `Участок ${plotNumber}`;
  if (cityAddress) return cityAddress;
  return "—";
};

const categoryTitle = (category: string) => {
  if (category === "membership") return "Членский взнос";
  if (category === "electricity") return "Электроэнергия";
  if (category === "target") return "Целевой взнос";
  return category;
};

const loadPlots = async (params?: { plotIds?: string[] | null; plotQuery?: string | null }) => {
  const conditions = [] as ReturnType<typeof sql>[];
  if (params?.plotIds?.length) {
    const values = params.plotIds.map((value) => sql`${value}`);
    conditions.push(sql`id in (${sql.join(values, sql`, `)})`);
  }
  if (params?.plotQuery) {
    const q = `%${params.plotQuery.toLowerCase().trim()}%`;
    conditions.push(sql`(lower(plot_number) like ${q} or lower(snt_street_number) like ${q} or lower(city_address) like ${q})`);
  }
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;
  return sql<PlotRow[]>`
    select id, plot_number, snt_street_number, city_address
    from plots
    ${where}
    order by plot_number asc nulls last, snt_street_number asc nulls last
  `;
};

export async function previewAccruals(params: {
  period: string;
  category: "membership" | "electricity" | "target";
  tariff?: number | null;
  fixedAmount?: number | null;
  plotIds?: string[] | null;
  plotQuery?: string | null;
}) {
  const plots: PlotRow[] = await loadPlots({ plotIds: params.plotIds, plotQuery: params.plotQuery });
  return plots.map((plot: PlotRow) => {
    let amount = 0;
    if (params.fixedAmount !== null && params.fixedAmount !== undefined) {
      amount = params.fixedAmount;
    } else if (params.category === "membership") {
      amount = params.tariff ?? getMembershipFee(params.period) ?? 0;
    } else if (params.category === "electricity") {
      const tariff = params.tariff ?? getElectricityTariff(params.period) ?? 0;
      amount = tariff * 100;
    } else {
      amount = params.tariff ?? 0;
    }
    return {
      plotId: plot.id,
      plotLabel: formatPlotLabel(plot.plot_number, plot.snt_street_number, plot.city_address),
      amount,
      discount: 0,
    };
  });
}

export async function listAccruals(params?: {
  period?: string | null;
  category?: string | null;
  q?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params?.pageSize ?? 10));
  const conditions = [] as ReturnType<typeof sql>[];
  if (params?.period) {
    conditions.push(sql`a.period = ${params.period}`);
  }
  if (params?.category) {
    conditions.push(sql`a.category = ${params.category}`);
  }
  if (params?.q) {
    const q = `%${params.q.toLowerCase().trim()}%`;
    conditions.push(sql`(lower(pl.plot_number) like ${q} or lower(pl.snt_street_number) like ${q} or lower(pl.city_address) like ${q})`);
  }
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const countRows = await sql<{ total: number }[]>`
    select count(*)::int as total
    from billing_accruals a
    left join plots pl on pl.id = a.plot_id
    ${where}
  `;
  const total = countRows[0]?.total ?? 0;

  const rows: Array<{
    id: string;
    plot_id: string | null;
    period: string;
    category: string | null;
    amount: string | number;
    created_at: string;
    paid_amount: string | number | null;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
  }> = await sql<{
    id: string;
    plot_id: string | null;
    period: string;
    category: string | null;
    amount: string | number;
    created_at: string;
    paid_amount: string | number | null;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
  }[]>`
    select
      a.id,
      a.plot_id,
      a.period,
      a.category,
      a.amount,
      a.created_at::text as created_at,
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
    limit ${pageSize}
    offset ${(page - 1) * pageSize}
  `;

  const items = rows.map((row) => {
    const amount = typeof row.amount === "number" ? row.amount : Number(row.amount);
    const paidAmount = typeof row.paid_amount === "number" ? row.paid_amount : Number(row.paid_amount ?? 0);
    const remaining = Math.max(0, amount - paidAmount);
    const status = paidAmount <= 0 ? "open" : remaining > 0 ? "partially_paid" : "paid";
    return {
      id: row.id,
      date: row.created_at,
      plotId: row.plot_id ?? "",
      plot: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
      title: categoryTitle(row.category ?? ""),
      amount,
      paidAmount,
      remaining,
      status,
    };
  });

  return { items, total, page, pageSize };
}

export async function generateAccruals(params: {
  period: string;
  category: "membership" | "electricity" | "target";
  tariff?: number | null;
  fixedAmount?: number | null;
  plotIds?: string[] | null;
  plotQuery?: string | null;
}) {
  const rows = await previewAccruals(params);
  if (!rows.length) {
    return { createdCount: 0, skippedCount: 0, duplicates: [] as string[] };
  }
  const plotIds = rows.map((row) => row.plotId);
  const values = plotIds.map((value: string) => sql`${value}`);
  const existingRows: Array<{ plot_id: string }> = await sql<{ plot_id: string }[]>`
    select plot_id
    from billing_accruals
    where period = ${params.period}
      and category = ${params.category}
      and plot_id in (${sql.join(values, sql`, `)})
  `;
  const existing = new Set(existingRows.map((row) => row.plot_id));

  const payload = rows
    .filter((row) => !existing.has(row.plotId))
    .map((row) => ({
      plot_id: row.plotId,
      period: params.period,
      category: params.category,
      amount: row.amount,
      status: "open",
    }));

  if (payload.length) {
    await sql`
      insert into billing_accruals ${sql(payload, "plot_id", "period", "category", "amount", "status")}
    `;
  }

  const duplicates = rows.filter((row) => existing.has(row.plotId)).map((row) => row.plotId);
  return { createdCount: payload.length, skippedCount: duplicates.length, duplicates };
}

export async function deleteAccruals(params: { period: string }) {
  await sql`delete from billing_accruals where period = ${params.period}`;
}
