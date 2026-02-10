import "server-only";

import { sql } from "@/db/client";
import type { TemplateChannel, TemplateVariable } from "./templateEngine";

export interface NotificationTemplateRow {
  id: string;
  name: string;
  channel: TemplateChannel;
  subject: string | null;
  body: string;
  variablesSchema: TemplateVariable[];
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
}

type DbRow = {
  id: string;
  name: string;
  channel: TemplateChannel;
  subject: string | null;
  body: string;
  variables_schema: TemplateVariable[];
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
};

const mapRow = (row: DbRow): NotificationTemplateRow => ({
  id: row.id,
  name: row.name,
  channel: row.channel,
  subject: row.subject,
  body: row.body,
  variablesSchema: row.variables_schema,
  isActive: row.is_active,
  createdAt: row.created_at,
  createdBy: row.created_by,
  updatedAt: row.updated_at,
});

export async function listTemplates(filters?: {
  channel?: TemplateChannel;
  activeOnly?: boolean;
}): Promise<NotificationTemplateRow[]> {
  const conditions = [] as ReturnType<typeof sql>[];
  if (filters?.channel) conditions.push(sql`channel = ${filters.channel}`);
  if (filters?.activeOnly !== false) conditions.push(sql`is_active = true`);
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const rows = await sql<DbRow[]>`
    select * from notification_templates
    ${where}
    order by created_at desc
  `;
  return rows.map(mapRow);
}

export async function getTemplate(id: string): Promise<NotificationTemplateRow | null> {
  const rows = await sql<DbRow[]>`
    select * from notification_templates where id = ${id} limit 1
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createTemplate(input: {
  name: string;
  channel: TemplateChannel;
  subject?: string | null;
  body: string;
  variablesSchema: TemplateVariable[];
  createdBy: string | null;
}): Promise<NotificationTemplateRow> {
  const rows = await sql<DbRow[]>`
    insert into notification_templates (name, channel, subject, body, variables_schema, created_by)
    values (
      ${input.name},
      ${input.channel},
      ${input.subject ?? null},
      ${input.body},
      ${JSON.stringify(input.variablesSchema)},
      ${input.createdBy}
    )
    returning *
  `;
  return mapRow(rows[0]);
}

export async function updateTemplate(
  id: string,
  input: {
    name?: string;
    channel?: TemplateChannel;
    subject?: string | null;
    body?: string;
    variablesSchema?: TemplateVariable[];
    isActive?: boolean;
  },
): Promise<NotificationTemplateRow | null> {
  const sets = [] as ReturnType<typeof sql>[];
  if (input.name !== undefined) sets.push(sql`name = ${input.name}`);
  if (input.channel !== undefined) sets.push(sql`channel = ${input.channel}`);
  if (input.subject !== undefined) sets.push(sql`subject = ${input.subject}`);
  if (input.body !== undefined) sets.push(sql`body = ${input.body}`);
  if (input.variablesSchema !== undefined)
    sets.push(sql`variables_schema = ${JSON.stringify(input.variablesSchema)}`);
  if (input.isActive !== undefined) sets.push(sql`is_active = ${input.isActive}`);
  sets.push(sql`updated_at = now()`);

  if (sets.length === 1) return getTemplate(id);

  const rows = await sql<DbRow[]>`
    update notification_templates
    set ${sql.join(sets, sql`, `)}
    where id = ${id}
    returning *
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    delete from notification_templates where id = ${id} returning id
  `;
  return rows.length > 0;
}
