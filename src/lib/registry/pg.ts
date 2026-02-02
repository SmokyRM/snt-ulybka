import { sql } from "@/db/client";
import type { RegistryPerson, RegistryPlot } from "@/types/snt";
import { listPersons as listPersonsMock } from "@/lib/registry/core/persons.store";
import { listPlots as listPlotsMock, getPlot as getPlotMock } from "@/lib/registry/core/plots.store";
import { createPerson, updatePerson } from "@/lib/registry/core/persons.store";

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

const mapPerson = (row: {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  plots: string[] | null;
  verification_status: RegistryPerson["verificationStatus"] | null;
  status: RegistryPerson["status"] | null;
  merged_into_id: string | null;
  contact_verified_at: string | null;
  contact_verified_by: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}): RegistryPerson => ({
  id: row.id,
  fullName: row.full_name,
  phone: row.phone,
  email: row.email,
  plots: row.plots ?? [],
  verificationStatus: row.verification_status ?? "not_verified",
  status: row.status ?? "active",
  mergedIntoId: row.merged_into_id,
  contactVerifiedAt: row.contact_verified_at,
  contactVerifiedBy: row.contact_verified_by,
  userId: row.user_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapPlot = (row: {
  id: string;
  plot_number: string;
  snt_street_number: string | null;
  city_address: string | null;
  created_at: string;
  updated_at: string;
}): RegistryPlot => ({
  id: row.id,
  plotNumber: row.plot_number,
  sntStreetNumber: row.snt_street_number ?? "",
  cityAddress: row.city_address,
  personId: "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listPersons(params?: {
  q?: string;
  verificationStatus?: RegistryPerson["verificationStatus"];
  page?: number;
  pageSize?: number;
}): Promise<{ items: RegistryPerson[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 20));

  if (!hasPgConnection()) {
    const items = listPersonsMock({ q: params?.q, verificationStatus: params?.verificationStatus });
    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }

  const conditions = [] as ReturnType<typeof sql>[];
  if (params?.q) {
    const q = `%${params.q.toLowerCase().trim()}%`;
    conditions.push(
      sql`(lower(full_name) like ${q} or phone like ${q} or lower(email) like ${q})`,
    );
  }
  if (params?.verificationStatus) {
    conditions.push(sql`verification_status = ${params.verificationStatus}`);
  }
  conditions.push(sql`(status is null or status <> 'merged')`);

  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const countRows = await sql<{ total: number }[]>`
    select count(*)::int as total
    from persons
    ${where}
  `;
  const total = countRows[0]?.total ?? 0;

  const rows = await sql<{
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    plots: string[] | null;
    verification_status: RegistryPerson["verificationStatus"] | null;
    status: RegistryPerson["status"] | null;
    merged_into_id: string | null;
    contact_verified_at: string | null;
    contact_verified_by: string | null;
    user_id: string | null;
    created_at: string;
    updated_at: string;
  }[]>`
    select
      p.id,
      p.full_name,
      p.phone,
      p.email,
      p.verification_status,
      p.status,
      p.merged_into_id,
      p.contact_verified_at,
      p.contact_verified_by,
      p.user_id,
      p.created_at,
      p.updated_at,
      coalesce(array_agg(pp.plot_id) filter (where pp.plot_id is not null), '{}') as plots
    from persons p
    left join plot_persons pp on pp.person_id = p.id
    ${where}
    group by p.id
    order by p.created_at desc
    limit ${pageSize} offset ${(page - 1) * pageSize}
  `;

  return { items: rows.map(mapPerson), total, page, pageSize };
}

export async function listPlots(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: RegistryPlot[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 20));

  if (!hasPgConnection()) {
    const items = listPlotsMock({ q: params?.q });
    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }

  const conditions = [] as ReturnType<typeof sql>[];
  if (params?.q) {
    const q = `%${params.q.toLowerCase().trim()}%`;
    conditions.push(
      sql`(lower(plot_number) like ${q} or lower(snt_street_number) like ${q} or lower(city_address) like ${q})`,
    );
  }
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const countRows = await sql<{ total: number }[]>`
    select count(*)::int as total
    from plots
    ${where}
  `;
  const total = countRows[0]?.total ?? 0;

  const rows = await sql<{
    id: string;
    plot_number: string;
    snt_street_number: string | null;
    city_address: string | null;
    created_at: string;
    updated_at: string;
  }[]>`
    select id, plot_number, snt_street_number, city_address, created_at, updated_at
    from plots
    ${where}
    order by created_at desc
    limit ${pageSize} offset ${(page - 1) * pageSize}
  `;

  return { items: rows.map(mapPlot), total, page, pageSize };
}

export async function getPlot(id: string): Promise<{ plot: RegistryPlot; owners: RegistryPerson[] } | null> {
  if (!hasPgConnection()) {
    const plot = getPlotMock(id);
    if (!plot) return null;
    return { plot, owners: [] };
  }

  const plots = await sql<{
    id: string;
    plot_number: string;
    snt_street_number: string | null;
    city_address: string | null;
    created_at: string;
    updated_at: string;
  }[]>`
    select id, plot_number, snt_street_number, city_address, created_at, updated_at
    from plots
    where id = ${id}
    limit 1
  `;
  const plotRow = plots[0];
  if (!plotRow) return null;

  const ownersRows = await sql<{
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    verification_status: RegistryPerson["verificationStatus"] | null;
    status: RegistryPerson["status"] | null;
    merged_into_id: string | null;
    contact_verified_at: string | null;
    contact_verified_by: string | null;
    user_id: string | null;
    created_at: string;
    updated_at: string;
  }[]>`
    select p.id, p.full_name, p.phone, p.email, p.verification_status, p.status, p.merged_into_id,
           p.contact_verified_at, p.contact_verified_by, p.user_id, p.created_at, p.updated_at
    from persons p
    join plot_persons pp on pp.person_id = p.id
    where pp.plot_id = ${id}
  `;

  return { plot: mapPlot(plotRow), owners: ownersRows.map(mapPerson) };
}

export async function upsertPerson(input: {
  phone?: string | null;
  fullName?: string | null;
  email?: string | null;
}): Promise<RegistryPerson> {
  if (!hasPgConnection()) {
    const existing = input.phone
      ? listPersonsMock({ q: input.phone }).find((p) => p.phone === input.phone)
      : null;
    if (existing) {
      return updatePerson(existing.id, {
        fullName: input.fullName ?? existing.fullName,
        phone: input.phone ?? existing.phone ?? null,
        email: input.email ?? existing.email ?? null,
      }) as RegistryPerson;
    }
    return createPerson({
      fullName: input.fullName ?? "Без имени",
      phone: input.phone ?? null,
      email: input.email ?? null,
    });
  }

  const phone = input.phone?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;
  const fullName = input.fullName?.trim() || "Без имени";

  let existing: { id: string }[] = [];
  if (phone || email) {
    existing = await sql<{ id: string }[]>`
      select id from persons
      where ${phone ? sql`phone = ${phone}` : sql`false`}
         or ${email ? sql`email = ${email}` : sql`false`}
      limit 1
    `;
  }

  if (existing[0]) {
    const rows = await sql<{
      id: string;
      full_name: string;
      phone: string | null;
      email: string | null;
      plots: string[] | null;
      verification_status: RegistryPerson["verificationStatus"] | null;
      status: RegistryPerson["status"] | null;
      merged_into_id: string | null;
      contact_verified_at: string | null;
      contact_verified_by: string | null;
      user_id: string | null;
      created_at: string;
      updated_at: string;
    }[]>`
      update persons
      set full_name = ${fullName},
          phone = ${phone},
          email = ${email},
          updated_at = now()
      where id = ${existing[0].id}
      returning *, array[]::uuid[] as plots
    `;
    return mapPerson(rows[0]);
  }

  const rows = await sql<{
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    plots: string[] | null;
    verification_status: RegistryPerson["verificationStatus"] | null;
    status: RegistryPerson["status"] | null;
    merged_into_id: string | null;
    contact_verified_at: string | null;
    contact_verified_by: string | null;
    user_id: string | null;
    created_at: string;
    updated_at: string;
  }[]>`
    insert into persons (full_name, phone, email)
    values (${fullName}, ${phone}, ${email})
    returning *, array[]::uuid[] as plots
  `;

  return mapPerson(rows[0]);
}

export async function linkPersonToPlot(plotId: string, personId: string, role?: string | null): Promise<void> {
  if (!hasPgConnection()) {
    return;
  }

  await sql`
    insert into plot_persons (plot_id, person_id, role)
    values (${plotId}, ${personId}, ${role ?? null})
    on conflict (plot_id, person_id) do update set role = excluded.role
  `;
}

export async function unlinkPersonFromPlot(plotId: string, personId: string): Promise<void> {
  if (!hasPgConnection()) {
    return;
  }

  await sql`
    delete from plot_persons where plot_id = ${plotId} and person_id = ${personId}
  `;
}
