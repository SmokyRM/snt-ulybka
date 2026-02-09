import { sql } from "@/db/client";

export type FeeRuleAppliesTo = "all" | "street" | "plot" | "tag";
export type FeeRuleCalcType = "flat" | "per_area" | "per_kwh" | "custom";

export type BillingFeeRule = {
  id: string;
  name: string;
  periodFrom: string | null;
  periodTo: string | null;
  appliesTo: FeeRuleAppliesTo;
  selector: Record<string, unknown>;
  calcType: FeeRuleCalcType;
  amount: number;
  meta: Record<string, unknown>;
  createdAt: string;
  createdBy: string | null;
  isActive: boolean;
};

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

const mapRule = (row: {
  id: string;
  name: string;
  period_from: string | null;
  period_to: string | null;
  applies_to: FeeRuleAppliesTo;
  selector: Record<string, unknown>;
  calc_type: FeeRuleCalcType;
  amount: number | string;
  meta: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
}): BillingFeeRule => ({
  id: row.id,
  name: row.name,
  periodFrom: row.period_from,
  periodTo: row.period_to,
  appliesTo: row.applies_to,
  selector: row.selector ?? {},
  calcType: row.calc_type,
  amount: toNumber(row.amount),
  meta: row.meta ?? {},
  createdAt: row.created_at,
  createdBy: row.created_by,
  isActive: row.is_active,
});

export async function listFeeRules(params?: {
  activeOnly?: boolean;
  period?: string | null;
}) {
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
      name: string;
      period_from: string | null;
      period_to: string | null;
      applies_to: FeeRuleAppliesTo;
      selector: Record<string, unknown>;
      calc_type: FeeRuleCalcType;
      amount: number | string;
      meta: Record<string, unknown>;
      created_at: string;
      created_by: string | null;
      is_active: boolean;
    }>
  >`
    select
      id,
      name,
      period_from,
      period_to,
      applies_to,
      selector,
      calc_type,
      amount,
      meta,
      created_at::text as created_at,
      created_by,
      is_active
    from billing_fee_rules
    ${where}
    order by created_at desc
  `;
  return rows.map(mapRule);
}

export async function upsertFeeRule(input: {
  id?: string | null;
  name: string;
  periodFrom?: string | null;
  periodTo?: string | null;
  appliesTo: FeeRuleAppliesTo;
  selector?: Record<string, unknown>;
  calcType: FeeRuleCalcType;
  amount: number;
  meta?: Record<string, unknown>;
  createdBy: string | null;
  isActive: boolean;
}) {
  const payload = {
    name: input.name,
    period_from: input.periodFrom ?? null,
    period_to: input.periodTo ?? null,
    applies_to: input.appliesTo,
    selector: input.selector ?? {},
    calc_type: input.calcType,
    amount: input.amount,
    meta: input.meta ?? {},
    created_by: input.createdBy,
    is_active: input.isActive,
  };

  if (input.id) {
    const rows = await sql<
      Array<{
        id: string;
        name: string;
        period_from: string | null;
        period_to: string | null;
        applies_to: FeeRuleAppliesTo;
        selector: Record<string, unknown>;
        calc_type: FeeRuleCalcType;
        amount: number | string;
        meta: Record<string, unknown>;
        created_at: string;
        created_by: string | null;
        is_active: boolean;
      }>
    >`
      update billing_fee_rules
      set name = ${payload.name},
          period_from = ${payload.period_from},
          period_to = ${payload.period_to},
          applies_to = ${payload.applies_to},
          selector = ${payload.selector},
          calc_type = ${payload.calc_type},
          amount = ${payload.amount},
          meta = ${payload.meta},
          is_active = ${payload.is_active}
      where id = ${input.id}
      returning
        id,
        name,
        period_from,
        period_to,
        applies_to,
        selector,
        calc_type,
        amount,
        meta,
        created_at::text as created_at,
        created_by,
        is_active
    `;
    return rows[0] ? mapRule(rows[0]) : null;
  }

  const rows = await sql<
    Array<{
      id: string;
      name: string;
      period_from: string | null;
      period_to: string | null;
      applies_to: FeeRuleAppliesTo;
      selector: Record<string, unknown>;
      calc_type: FeeRuleCalcType;
      amount: number | string;
      meta: Record<string, unknown>;
      created_at: string;
      created_by: string | null;
      is_active: boolean;
    }>
  >`
    insert into billing_fee_rules
      (name, period_from, period_to, applies_to, selector, calc_type, amount, meta, created_by, is_active)
    values
      (${payload.name}, ${payload.period_from}, ${payload.period_to}, ${payload.applies_to}, ${payload.selector},
       ${payload.calc_type}, ${payload.amount}, ${payload.meta}, ${payload.created_by}, ${payload.is_active})
    returning
      id,
      name,
      period_from,
      period_to,
      applies_to,
      selector,
      calc_type,
      amount,
      meta,
      created_at::text as created_at,
      created_by,
      is_active
  `;
  return rows[0] ? mapRule(rows[0]) : null;
}

export async function deleteFeeRule(id: string) {
  const rows = await sql<{ id: string }[]>`
    delete from billing_fee_rules
    where id = ${id}
    returning id
  `;
  return rows[0]?.id ?? null;
}

export type FeeRulePlot = {
  id: string;
  plot_number: string | null;
  snt_street_number: string | null;
  city_address: string | null;
};

export async function listPlotsForRules(): Promise<FeeRulePlot[]> {
  return sql<FeeRulePlot[]>`
    select id, plot_number, snt_street_number, city_address
    from plots
    order by plot_number asc nulls last, snt_street_number asc nulls last
  `;
}
