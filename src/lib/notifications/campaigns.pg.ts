import "server-only";

import { sql } from "@/db/client";

export type CampaignStatus = "draft" | "dry_run" | "scheduled" | "sending" | "done" | "failed" | "cancelled";

export interface CampaignSegment {
  minDebt?: number;
  period?: string;
  street?: string;
  status?: string;
}

export interface CampaignStats {
  targeted: number;
  sent: number;
  failed: number;
}

export interface CampaignRow {
  id: string;
  name: string;
  channel: string;
  templateId: string | null;
  segment: CampaignSegment;
  status: CampaignStatus;
  createdAt: string;
  createdBy: string | null;
  scheduledFor: string | null;
  stats: CampaignStats;
}

export interface DeliveryRow {
  id: string;
  campaignId: string;
  userId: string | null;
  personId: string | null;
  plotId: string | null;
  channel: string;
  recipientMasked: string;
  status: "queued" | "sent" | "failed" | "skipped";
  error: string | null;
  providerMessageId: string | null;
  createdAt: string;
  sentAt: string | null;
}

type DbCampaign = {
  id: string;
  name: string;
  channel: string;
  template_id: string | null;
  segment: CampaignSegment;
  status: CampaignStatus;
  created_at: string;
  created_by: string | null;
  scheduled_for: string | null;
  stats: CampaignStats;
};

type DbDelivery = {
  id: string;
  campaign_id: string;
  user_id: string | null;
  person_id: string | null;
  plot_id: string | null;
  channel: string;
  recipient_masked: string;
  status: "queued" | "sent" | "failed" | "skipped";
  error: string | null;
  provider_message_id: string | null;
  created_at: string;
  sent_at: string | null;
};

const mapCampaign = (r: DbCampaign): CampaignRow => ({
  id: r.id,
  name: r.name,
  channel: r.channel,
  templateId: r.template_id,
  segment: r.segment,
  status: r.status,
  createdAt: r.created_at,
  createdBy: r.created_by,
  scheduledFor: r.scheduled_for,
  stats: r.stats,
});

const mapDelivery = (r: DbDelivery): DeliveryRow => ({
  id: r.id,
  campaignId: r.campaign_id,
  userId: r.user_id,
  personId: r.person_id,
  plotId: r.plot_id,
  channel: r.channel,
  recipientMasked: r.recipient_masked,
  status: r.status,
  error: r.error,
  providerMessageId: r.provider_message_id,
  createdAt: r.created_at,
  sentAt: r.sent_at,
});

export async function listCampaignsDb(filters?: { status?: CampaignStatus }): Promise<CampaignRow[]> {
  const conditions = [] as ReturnType<typeof sql>[];
  if (filters?.status) conditions.push(sql`status = ${filters.status}`);
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const rows = await sql<DbCampaign[]>`
    select * from notification_campaigns ${where} order by created_at desc limit 200
  `;
  return rows.map(mapCampaign);
}

export async function getCampaign(id: string): Promise<CampaignRow | null> {
  const rows = await sql<DbCampaign[]>`
    select * from notification_campaigns where id = ${id} limit 1
  `;
  return rows[0] ? mapCampaign(rows[0]) : null;
}

export async function createCampaignDb(input: {
  name: string;
  channel: string;
  templateId: string | null;
  segment: CampaignSegment;
  createdBy: string | null;
}): Promise<CampaignRow> {
  const rows = await sql<DbCampaign[]>`
    insert into notification_campaigns (name, channel, template_id, segment, created_by)
    values (${input.name}, ${input.channel}, ${input.templateId}, ${JSON.stringify(input.segment)}, ${input.createdBy})
    returning *
  `;
  return mapCampaign(rows[0]);
}

export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus,
  stats?: CampaignStats,
): Promise<CampaignRow | null> {
  const rows = stats
    ? await sql<DbCampaign[]>`
        update notification_campaigns
        set status = ${status}, stats = ${JSON.stringify(stats)}
        where id = ${id}
        returning *
      `
    : await sql<DbCampaign[]>`
        update notification_campaigns
        set status = ${status}
        where id = ${id}
        returning *
      `;
  return rows[0] ? mapCampaign(rows[0]) : null;
}

export async function createDelivery(input: {
  campaignId: string;
  userId: string | null;
  personId: string | null;
  plotId: string | null;
  channel: string;
  recipientMasked: string;
  status: "queued" | "sent" | "failed" | "skipped";
  error: string | null;
  providerMessageId: string | null;
  sentAt: string | null;
}): Promise<DeliveryRow> {
  const rows = await sql<DbDelivery[]>`
    insert into notification_deliveries
      (campaign_id, user_id, person_id, plot_id, channel, recipient_masked, status, error, provider_message_id, sent_at)
    values (
      ${input.campaignId}, ${input.userId}, ${input.personId}, ${input.plotId},
      ${input.channel}, ${input.recipientMasked}, ${input.status},
      ${input.error}, ${input.providerMessageId}, ${input.sentAt}
    )
    returning *
  `;
  return mapDelivery(rows[0]);
}

export async function listDeliveries(
  campaignId: string,
  filters?: { status?: string },
): Promise<DeliveryRow[]> {
  const conditions = [sql`campaign_id = ${campaignId}`] as ReturnType<typeof sql>[];
  if (filters?.status) conditions.push(sql`status = ${filters.status}`);
  const where = sql`where ${sql.join(conditions, sql` and `)}`;

  const rows = await sql<DbDelivery[]>`
    select * from notification_deliveries ${where} order by created_at desc limit 500
  `;
  return rows.map(mapDelivery);
}

export async function countDeliveriesByCampaign(campaignId: string): Promise<{
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  read: number;
}> {
  const rows = await sql<{ status: string; cnt: string }[]>`
    select status, count(*)::text as cnt
    from notification_deliveries
    where campaign_id = ${campaignId}
    group by status
  `;
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = parseInt(r.cnt, 10);
  return {
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    sent: counts["sent"] ?? 0,
    failed: counts["failed"] ?? 0,
    skipped: counts["skipped"] ?? 0,
    read: 0,
  };
}
