import { sql } from "@/db/client";

export type PenaltyRule = {
  id: string;
  rate: number;
  rateType: "percent_per_year" | "percent_per_day" | "fixed";
  gracePeriodDays: number;
  periodFrom: string | null;
  periodTo: string | null;
  createdAt: string;
  createdBy: string | null;
  isActive: boolean;
};

export type PenaltyException = {
  id: string;
  plotId: string | null;
  personId: string | null;
  period: string;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
};

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export async function listPenaltyRules(params?: { activeOnly?: boolean; period?: string | null }) {
  const conditions = [] as ReturnType<typeof sql>[];
  if (params?.activeOnly) conditions.push(sql`is_active = true`);
  if (params?.period) {
    conditions.push(
      sql`(period_from is null or period_from <= ${params.period}) and (period_to is null or period_to >= ${params.period})`
    );
  }
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;
  const rows = await sql<
    Array<{
      id: string;
      rate: number | string;
      rate_type: "percent_per_year" | "percent_per_day" | "fixed";
      grace_period_days: number;
      period_from: string | null;
      period_to: string | null;
      created_at: string;
      created_by: string | null;
      is_active: boolean;
    }>
  >`
    select
      id,
      rate,
      rate_type,
      grace_period_days,
      period_from,
      period_to,
      created_at::text as created_at,
      created_by,
      is_active
    from billing_penalty_rules
    ${where}
    order by created_at desc
  `;
  return rows.map((row) => ({
    id: row.id,
    rate: toNumber(row.rate),
    rateType: row.rate_type,
    gracePeriodDays: row.grace_period_days ?? 0,
    periodFrom: row.period_from,
    periodTo: row.period_to,
    createdAt: row.created_at,
    createdBy: row.created_by,
    isActive: row.is_active,
  }));
}

export async function getActivePenaltyRule(period: string) {
  const rules = await listPenaltyRules({ activeOnly: true, period });
  return rules[0] ?? null;
}

export async function listPenaltyExceptions(period?: string | null) {
  const where = period ? sql`where period = ${period}` : sql``;
  const rows = await sql<
    Array<{
      id: string;
      plot_id: string | null;
      person_id: string | null;
      period: string;
      reason: string | null;
      created_by: string | null;
      created_at: string;
    }>
  >`
    select
      id,
      plot_id,
      person_id,
      period,
      reason,
      created_by,
      created_at::text as created_at
    from billing_penalty_exceptions
    ${where}
    order by created_at desc
  `;
  return rows.map((row) => ({
    id: row.id,
    plotId: row.plot_id,
    personId: row.person_id,
    period: row.period,
    reason: row.reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
}

export async function createPenaltyException(input: {
  plotId: string | null;
  personId: string | null;
  period: string;
  reason: string | null;
  createdBy: string | null;
}) {
  const rows = await sql<
    Array<{
      id: string;
      plot_id: string | null;
      person_id: string | null;
      period: string;
      reason: string | null;
      created_by: string | null;
      created_at: string;
    }>
  >`
    insert into billing_penalty_exceptions (plot_id, person_id, period, reason, created_by)
    values (${input.plotId}, ${input.personId}, ${input.period}, ${input.reason}, ${input.createdBy})
    returning
      id,
      plot_id,
      person_id,
      period,
      reason,
      created_by,
      created_at::text as created_at
  `;
  return rows[0]
    ? {
        id: rows[0].id,
        plotId: rows[0].plot_id,
        personId: rows[0].person_id,
        period: rows[0].period,
        reason: rows[0].reason,
        createdBy: rows[0].created_by,
        createdAt: rows[0].created_at,
      }
    : null;
}
