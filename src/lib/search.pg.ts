import { sql } from "@/db/client";
import { normalizePhone } from "@/lib/utils/phone";

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

export type SearchPersonResult = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  href: string;
};

export type SearchPlotResult = {
  id: string;
  plotNumber: string;
  sntStreetNumber: string | null;
  cityAddress: string | null;
  ownerName: string | null;
  href: string;
};

export type SearchPaymentResult = {
  id: string;
  payer: string | null;
  amount: number;
  paidAt: string | null;
  plotLabel: string | null;
  externalId: string | null;
  href: string;
};

export type GlobalSearchResult = {
  persons: SearchPersonResult[];
  plots: SearchPlotResult[];
  payments: SearchPaymentResult[];
};

const formatPlotLabel = (plotNumber: string | null, sntStreetNumber: string | null, cityAddress: string | null) => {
  if (sntStreetNumber && plotNumber) {
    return `Линия ${sntStreetNumber}, участок ${plotNumber}`;
  }
  if (plotNumber) return `Участок ${plotNumber}`;
  if (cityAddress) return cityAddress;
  return null;
};

/**
 * Global search across persons, plots, and payments.
 * Uses PG full-text search with ILIKE fallback.
 */
export async function globalSearch(params: {
  q: string;
  limit?: number;
}): Promise<GlobalSearchResult> {
  const { q, limit = 20 } = params;
  const safeLimit = Math.min(limit, 20);
  const trimmed = q.trim().toLowerCase();

  if (trimmed.length < 2) {
    return { persons: [], plots: [], payments: [] };
  }

  // Normalize phone for search
  const normalizedPhone = normalizePhone(trimmed);
  const hasPhoneDigits = normalizedPhone.length >= 4;

  const likePattern = `%${trimmed}%`;
  const phoneLikePattern = hasPhoneDigits ? `%${normalizedPhone}%` : null;

  // Search persons
  const personConditions = [sql`lower(full_name) like ${likePattern}`];
  if (phoneLikePattern) {
    personConditions.push(sql`regexp_replace(phone, '[^0-9]', '', 'g') like ${phoneLikePattern}`);
  }
  personConditions.push(sql`lower(email) like ${likePattern}`);

  const personRows = await sql<{
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
  }[]>`
    select id, full_name, phone, email
    from persons
    where (status is null or status <> 'merged')
      and (${sql.join(personConditions, sql` or `)})
    order by created_at desc
    limit ${safeLimit}
  `;

  const persons: SearchPersonResult[] = personRows.map((row: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
  }) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    href: `/office/registry?q=${encodeURIComponent(row.full_name)}`,
  }));

  // Search plots with owner info
  const plotConditions = [
    sql`lower(p.plot_number) like ${likePattern}`,
    sql`lower(p.snt_street_number) like ${likePattern}`,
    sql`lower(p.city_address) like ${likePattern}`,
  ];

  const plotRows = await sql<{
    id: string;
    plot_number: string;
    snt_street_number: string | null;
    city_address: string | null;
    owner_name: string | null;
  }[]>`
    select distinct on (p.id)
      p.id,
      p.plot_number,
      p.snt_street_number,
      p.city_address,
      per.full_name as owner_name
    from plots p
    left join plot_persons pp on pp.plot_id = p.id
    left join persons per on per.id = pp.person_id
    where (${sql.join(plotConditions, sql` or `)})
    order by p.id, pp.created_at desc
    limit ${safeLimit}
  `;

  const plots: SearchPlotResult[] = plotRows.map((row: {
    id: string;
    plot_number: string;
    snt_street_number: string | null;
    city_address: string | null;
    owner_name: string | null;
  }) => ({
    id: row.id,
    plotNumber: row.plot_number,
    sntStreetNumber: row.snt_street_number,
    cityAddress: row.city_address,
    ownerName: row.owner_name,
    href: `/office/registry/${row.id}`,
  }));

  // Search payments
  const paymentConditions = [sql`lower(bp.payer) like ${likePattern}`];
  // Search by amount if query looks like a number
  const amountMatch = trimmed.match(/^[\d.,\s]+$/);
  if (amountMatch) {
    const cleanAmount = trimmed.replace(/[,\s]/g, ".").replace(/\.+/g, ".");
    const numValue = parseFloat(cleanAmount);
    if (!isNaN(numValue) && numValue > 0) {
      paymentConditions.push(sql`bp.amount = ${numValue}`);
    }
  }
  // Search by external_id if available
  paymentConditions.push(sql`lower(bp.external_id) like ${likePattern}`);
  // Search by plot_ref
  paymentConditions.push(sql`lower(bp.plot_ref) like ${likePattern}`);

  const paymentRows = await sql<{
    id: string;
    payer: string | null;
    amount: string | number;
    paid_at: string | null;
    external_id: string | null;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
  }[]>`
    select
      bp.id,
      bp.payer,
      bp.amount,
      bp.paid_at::text as paid_at,
      bp.external_id,
      pl.plot_number,
      pl.snt_street_number,
      pl.city_address
    from billing_payments bp
    left join plots pl on pl.id = bp.plot_id
    where (${sql.join(paymentConditions, sql` or `)})
    order by bp.paid_at desc nulls last, bp.created_at desc
    limit ${safeLimit}
  `;

  const payments: SearchPaymentResult[] = paymentRows.map((row: {
    id: string;
    payer: string | null;
    amount: string | number;
    paid_at: string | null;
    external_id: string | null;
    plot_number: string | null;
    snt_street_number: string | null;
    city_address: string | null;
  }) => ({
    id: row.id,
    payer: row.payer,
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount),
    paidAt: row.paid_at,
    externalId: row.external_id,
    plotLabel: formatPlotLabel(row.plot_number, row.snt_street_number, row.city_address),
    href: `/office/billing/payments?q=${encodeURIComponent(row.payer ?? row.id)}`,
  }));

  return { persons, plots, payments };
}
