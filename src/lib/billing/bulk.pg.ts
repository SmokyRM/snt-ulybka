import { sql } from "@/db/client";

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

export type BulkUpdateResult = {
  updated: number;
  ids: string[];
};

/**
 * Bulk update payment status (e.g., mark as "outside_snt", "void", etc.)
 * Max 200 records per call.
 */
export async function bulkUpdatePaymentStatus(params: {
  ids: string[];
  status: string;
  reason?: string;
}): Promise<BulkUpdateResult> {
  const { ids, status, reason } = params;

  if (ids.length === 0) {
    return { updated: 0, ids: [] };
  }

  if (ids.length > 200) {
    throw new Error("Превышен лимит: максимум 200 записей за один запрос");
  }

  const idValues = ids.map((id) => sql`${id}`);

  const result = await sql<{ id: string }[]>`
    update billing_payments
    set
      status = ${status},
      updated_at = now()
    where id in (${sql.join(idValues, sql`, `)})
    returning id
  `;

  return {
    updated: result.length,
    ids: result.map((r: { id: string }) => r.id),
  };
}

/**
 * Bulk update payment match_status (e.g., mark as "ignored", "manual", etc.)
 */
export async function bulkUpdatePaymentMatchStatus(params: {
  ids: string[];
  matchStatus: string;
}): Promise<BulkUpdateResult> {
  const { ids, matchStatus } = params;

  if (ids.length === 0) {
    return { updated: 0, ids: [] };
  }

  if (ids.length > 200) {
    throw new Error("Превышен лимит: максимум 200 записей за один запрос");
  }

  const idValues = ids.map((id) => sql`${id}`);

  const result = await sql<{ id: string }[]>`
    update billing_payments
    set
      match_status = ${matchStatus},
      updated_at = now()
    where id in (${sql.join(idValues, sql`, `)})
    returning id
  `;

  return {
    updated: result.length,
    ids: result.map((r: { id: string }) => r.id),
  };
}

/**
 * Bulk assign period to accruals
 */
export async function bulkAssignAccrualPeriod(params: {
  ids: string[];
  period: string;
}): Promise<BulkUpdateResult> {
  const { ids, period } = params;

  if (ids.length === 0) {
    return { updated: 0, ids: [] };
  }

  if (ids.length > 200) {
    throw new Error("Превышен лимит: максимум 200 записей за один запрос");
  }

  const idValues = ids.map((id) => sql`${id}`);

  const result = await sql<{ id: string }[]>`
    update billing_accruals
    set
      period = ${period},
      updated_at = now()
    where id in (${sql.join(idValues, sql`, `)})
    returning id
  `;

  return {
    updated: result.length,
    ids: result.map((r: { id: string }) => r.id),
  };
}

/**
 * Bulk verify persons (set verification_status)
 */
export async function bulkVerifyPersons(params: {
  ids: string[];
  verificationStatus: string;
  verifiedBy?: string;
}): Promise<BulkUpdateResult> {
  const { ids, verificationStatus, verifiedBy } = params;

  if (ids.length === 0) {
    return { updated: 0, ids: [] };
  }

  if (ids.length > 200) {
    throw new Error("Превышен лимит: максимум 200 записей за один запрос");
  }

  const idValues = ids.map((id) => sql`${id}`);

  const result = await sql<{ id: string }[]>`
    update persons
    set
      verification_status = ${verificationStatus},
      contact_verified_at = ${verificationStatus === "verified" ? sql`now()` : sql`null`},
      contact_verified_by = ${verifiedBy ?? null},
      updated_at = now()
    where id in (${sql.join(idValues, sql`, `)})
    returning id
  `;

  return {
    updated: result.length,
    ids: result.map((r: { id: string }) => r.id),
  };
}
