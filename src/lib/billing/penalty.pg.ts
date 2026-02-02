import { sql } from "@/db/client";
import { PENALTY_POLICY_VERSION, type PenaltyAccrual, type PenaltyAccrualStatus } from "@/lib/penaltyAccruals.store";

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

type DebtRow = {
  plotId: string;
  period: string;
  date: string;
  originalAmount: number;
  remaining: number;
  plotLabel: string;
};

type PreviewRow = DebtRow & {
  daysOverdue: number;
  penaltyAmount: number;
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

const buildPeriodRange = (period: string) => {
  const [year, month] = period.split("-");
  const start = `${year}-${month}-01`;
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  endDate.setUTCDate(0);
  return { start, end: endDate.toISOString().slice(0, 10) };
};

type PenaltyRow = {
  id: string;
  plot_id: string;
  period: string;
  amount: number | string;
  status: PenaltyAccrualStatus;
  metadata: PenaltyAccrual["metadata"];
  linked_charge_id: string | null;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
  frozen_by: string | null;
  frozen_at: string | null;
  freeze_reason: string | null;
  unfrozen_by: string | null;
  unfrozen_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const mapPenalty = (row: PenaltyRow): PenaltyAccrual => ({
  id: row.id,
  plotId: row.plot_id,
  period: row.period,
  amount: toNumber(row.amount),
  status: row.status,
  metadata: row.metadata,
  linkedChargeId: row.linked_charge_id,
  voidedBy: row.voided_by,
  voidedAt: row.voided_at,
  voidReason: row.void_reason,
  frozenBy: row.frozen_by,
  frozenAt: row.frozen_at,
  freezeReason: row.freeze_reason,
  unfrozenBy: row.unfrozen_by,
  unfrozenAt: row.unfrozen_at,
  createdBy: row.created_by ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listPenaltyAccruals(filters?: {
  plotId?: string | null;
  period?: string | null;
  status?: PenaltyAccrualStatus | null;
  asOf?: string | null;
}) {
  const conditions = [] as ReturnType<typeof sql>[];
  if (filters?.plotId) conditions.push(sql`plot_id = ${filters.plotId}`);
  if (filters?.period) conditions.push(sql`period = ${filters.period}`);
  if (filters?.status) conditions.push(sql`status = ${filters.status}`);
  if (filters?.asOf) conditions.push(sql`(metadata->>'asOf') = ${filters.asOf}`);
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const rows = await sql<
    Array<{
      id: string;
      plot_id: string;
      period: string;
      amount: number | string;
      status: PenaltyAccrualStatus;
      metadata: PenaltyAccrual["metadata"];
      linked_charge_id: string | null;
      voided_by: string | null;
      voided_at: string | null;
      void_reason: string | null;
      frozen_by: string | null;
      frozen_at: string | null;
      freeze_reason: string | null;
      unfrozen_by: string | null;
      unfrozen_at: string | null;
      created_by: string | null;
      created_at: string;
      updated_at: string;
    }>
  >`
    select *
    from billing_penalty_accruals
    ${where}
    order by created_at desc
  `;

  return rows.map(mapPenalty);
}

export async function getPenaltyAccrualsSummary(filters?: { period?: string }) {
  const rows = await sql<Array<{ total: number; active: number; frozen: number; voided: number; total_amount: number; active_amount: number }>>`
    select
      count(*)::int as total,
      count(*) filter (where status = 'active')::int as active,
      count(*) filter (where status = 'frozen')::int as frozen,
      count(*) filter (where status = 'voided')::int as voided,
      coalesce(sum(amount), 0) as total_amount,
      coalesce(sum(amount) filter (where status = 'active'), 0) as active_amount
    from billing_penalty_accruals
    ${filters?.period ? sql`where period = ${filters.period}` : sql``}
  `;
  const row = rows[0] ?? {
    total: 0,
    active: 0,
    frozen: 0,
    voided: 0,
    total_amount: 0,
    active_amount: 0,
  };
  return {
    total: row.total,
    active: row.active,
    frozen: row.frozen,
    voided: row.voided,
    totalAmount: toNumber(row.total_amount),
    activeAmount: toNumber(row.active_amount),
  };
}

export async function listDebtRows(params: { from?: string | null; to?: string | null }): Promise<DebtRow[]> {
  const conditions = [] as ReturnType<typeof sql>[];
  if (params.from) conditions.push(sql`a.created_at >= ${params.from}`);
  if (params.to) conditions.push(sql`a.created_at <= ${params.to}`);
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const rows = await sql<
    Array<{
      id: string;
      plot_id: string;
      period: string;
      amount: number | string;
      created_at: string;
      paid: number | string;
      plot_number: string | null;
      snt_street_number: string | null;
      city_address: string | null;
    }>
  >`
    select
      a.id,
      a.plot_id,
      a.period,
      a.amount,
      a.created_at::text as created_at,
      coalesce(sum(al.amount), 0) as paid,
      pl.plot_number,
      pl.snt_street_number,
      pl.city_address
    from billing_accruals a
    left join billing_allocations al on al.accrual_id = a.id
    left join plots pl on pl.id = a.plot_id
    ${where}
    group by a.id, pl.plot_number, pl.snt_street_number, pl.city_address
    having (a.amount - coalesce(sum(al.amount), 0)) > 0
  `;
  return rows.map((row: {
    id: string;
    plot_id: string;
    period: string;
    amount: number | string;
    created_at: string;
    paid: number | string;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
  }) => ({
    plotId: row.plot_id,
    period: row.period,
    date: row.created_at,
    originalAmount: toNumber(row.amount),
    remaining: Math.max(0, toNumber(row.amount) - toNumber(row.paid)),
    plotLabel: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
  }));
}

export async function previewPenalty(params: {
  asOf: string;
  rate: number;
  from?: string | null;
  to?: string | null;
  minPenalty?: number | null;
}): Promise<{ rows: PreviewRow[]; totalPenalty: number }> {
  const asOfDate = new Date(params.asOf);
  const debtRows = await listDebtRows({ from: params.from ?? null, to: params.to ?? null });
  const minPenalty = params.minPenalty ?? 0;
  const previewRows: PreviewRow[] = debtRows
    .map((row: DebtRow) => {
      const daysOverdue = Math.max(0, Math.floor((asOfDate.getTime() - new Date(row.date).getTime()) / 86400000));
      const penaltyAmount = Math.round((row.remaining ?? 0) * params.rate * (daysOverdue / 365));
      return { ...row, daysOverdue, penaltyAmount };
    })
    .filter((row: PreviewRow) => row.penaltyAmount >= minPenalty);
  const totalPenalty = previewRows.reduce((sum: number, row) => sum + row.penaltyAmount, 0);
  return { rows: previewRows, totalPenalty };
}

export async function upsertPenaltyAccrual(input: {
  plotId: string;
  period: string;
  amount: number;
  metadata: PenaltyAccrual["metadata"];
  createdBy: string;
}): Promise<{ accrual: PenaltyAccrual; action: "created" | "updated" | "skipped"; skipReason?: string }> {
  const existing = await sql<Array<{ id: string; status: PenaltyAccrualStatus }>>`
    select id, status
    from billing_penalty_accruals
    where plot_id = ${input.plotId} and period = ${input.period}
    order by created_at desc
    limit 1
  `;
  const row = existing[0];
  if (row?.status === "frozen") {
    const accrualRows = await sql<Array<{ id: string }>>`
      select id from billing_penalty_accruals where id = ${row.id}
    `;
    const existingRows = await sql<PenaltyRow[]>`
      select *
      from billing_penalty_accruals
      where id = ${row.id}
    `;
    return { accrual: mapPenalty(existingRows[0]), action: "skipped", skipReason: "frozen" };
  }

  if (row?.id) {
    const updated = await sql<PenaltyRow[]>`
      update billing_penalty_accruals
      set amount = ${input.amount}, metadata = ${input.metadata}, updated_at = now()
      where id = ${row.id}
      returning *
    `;
    return { accrual: mapPenalty(updated[0]), action: "updated" };
  }

  const created = await sql<PenaltyRow[]>`
    insert into billing_penalty_accruals (plot_id, period, amount, status, metadata, created_by)
    values (${input.plotId}, ${input.period}, ${input.amount}, 'active', ${input.metadata}, ${input.createdBy})
    returning *
  `;
  return { accrual: mapPenalty(created[0]), action: "created" };
}

export async function freezePenalty(id: string, userId: string, reason: string) {
  const rows = await sql<PenaltyRow[]>`
    update billing_penalty_accruals
    set status = 'frozen', frozen_by = ${userId}, frozen_at = now(), freeze_reason = ${reason}, updated_at = now()
    where id = ${id} and status <> 'voided'
    returning *
  `;
  return rows[0] ? mapPenalty(rows[0]) : null;
}

export async function unfreezePenalty(id: string, userId: string) {
  const rows = await sql<PenaltyRow[]>`
    update billing_penalty_accruals
    set status = 'active', unfrozen_by = ${userId}, unfrozen_at = now(), updated_at = now()
    where id = ${id} and status = 'frozen'
    returning *
  `;
  return rows[0] ? mapPenalty(rows[0]) : null;
}

export async function voidPenalty(id: string, userId: string, reason: string) {
  const rows = await sql<PenaltyRow[]>`
    update billing_penalty_accruals
    set status = 'voided', voided_by = ${userId}, voided_at = now(), void_reason = ${reason}, updated_at = now()
    where id = ${id} and status <> 'voided'
    returning *
  `;
  return rows[0] ? mapPenalty(rows[0]) : null;
}

export async function unvoidPenalty(id: string, userId: string) {
  const rows = await sql<PenaltyRow[]>`
    update billing_penalty_accruals
    set status = 'active', voided_by = null, voided_at = null, void_reason = null, updated_at = now()
    where id = ${id} and status = 'voided'
    returning *
  `;
  return rows[0] ? mapPenalty(rows[0]) : null;
}

export async function recalcPenalty(id: string, newAmount: number, newMetadata: PenaltyAccrual["metadata"]) {
  const rows = await sql<PenaltyRow[]>`
    update billing_penalty_accruals
    set amount = ${newAmount}, metadata = ${newMetadata}, updated_at = now()
    where id = ${id} and status = 'active'
    returning *
  `;
  return rows[0] ? mapPenalty(rows[0]) : null;
}

export async function recalcByPeriod(params: {
  period: string;
  asOf: string;
  rate: number;
  plotIds?: string[] | null;
  limit?: number | null;
  includeVoided?: boolean;
  createdBy: string;
}) {
  const preview = await previewPenalty({ asOf: params.asOf, rate: params.rate, from: null, to: null });
  const ratePerDay = params.rate / 365;
  const period = params.period;
  const entries = preview.rows.filter((row: PreviewRow) => row.period === period);
  const filtered = params.plotIds?.length
    ? entries.filter((row: PreviewRow) => params.plotIds!.includes(row.plotId))
    : entries;
  const limited = params.limit ? filtered.slice(0, params.limit) : filtered;

  const results = {
    updated: 0,
    created: 0,
    skippedFrozen: 0,
    skippedVoided: 0,
    skippedZeroDebt: 0,
    sample: [] as Array<{ plotId: string; plotLabel: string; oldAmount: number; newAmount: number; action: string }>,
  };

  for (const row of limited) {
    const newAmount = row.penaltyAmount;
    if (newAmount <= 0) {
      results.skippedZeroDebt += 1;
      continue;
    }
    const existing = await listPenaltyAccruals({ plotId: row.plotId, period });
    const current = existing[0];
    if (current?.status === "voided" && !params.includeVoided) {
      results.skippedVoided += 1;
      continue;
    }
    if (current?.status === "frozen") {
      results.skippedFrozen += 1;
      continue;
    }
    const upsertResult = await upsertPenaltyAccrual({
      plotId: row.plotId,
      period,
      amount: newAmount,
      metadata: {
        asOf: params.asOf,
        ratePerDay,
        baseDebt: row.remaining,
        daysOverdue: row.daysOverdue,
        policyVersion: PENALTY_POLICY_VERSION,
      },
      createdBy: params.createdBy,
    });
    if (upsertResult.action === "created") results.created += 1;
    if (upsertResult.action === "updated") results.updated += 1;
    if (results.sample.length < 5) {
      results.sample.push({
        plotId: row.plotId,
        plotLabel: row.plotLabel ?? row.plotId,
        oldAmount: current?.amount ?? 0,
        newAmount,
        action: upsertResult.action,
      });
    }
  }

  return results;
}
