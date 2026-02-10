import "server-only";

import { sql } from "@/db/client";

export type NotificationSourceType = "campaign" | "system" | "ticket" | "billing";

export interface UserNotificationRow {
  id: string;
  userId: string;
  title: string;
  body: string;
  sourceType: NotificationSourceType;
  sourceId: string | null;
  channel: string | null;
  link: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

type DbRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  source_type: NotificationSourceType;
  source_id: string | null;
  channel: string | null;
  link: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
};

const mapRow = (r: DbRow): UserNotificationRow => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  body: r.body,
  sourceType: r.source_type,
  sourceId: r.source_id,
  channel: r.channel,
  link: r.link,
  deliveredAt: r.delivered_at,
  readAt: r.read_at,
  createdAt: r.created_at,
});

export async function listUserNotifications(
  userId: string,
  options?: { limit?: number; cursor?: string },
): Promise<UserNotificationRow[]> {
  const limit = options?.limit ?? 50;
  const cursorCondition = options?.cursor
    ? sql`and created_at < ${options.cursor}`
    : sql``;

  const rows = await sql<DbRow[]>`
    select * from user_notifications
    where user_id = ${userId} ${cursorCondition}
    order by created_at desc
    limit ${limit}
  `;
  return rows.map(mapRow);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await sql<{ cnt: string }[]>`
    select count(*)::text as cnt
    from user_notifications
    where user_id = ${userId} and read_at is null
  `;
  return parseInt(rows[0]?.cnt ?? "0", 10);
}

export async function getUserNotification(
  id: string,
  userId: string,
): Promise<UserNotificationRow | null> {
  const rows = await sql<DbRow[]>`
    select * from user_notifications
    where id = ${id} and user_id = ${userId}
    limit 1
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function markRead(id: string, userId: string): Promise<UserNotificationRow | null> {
  const rows = await sql<DbRow[]>`
    update user_notifications
    set read_at = now()
    where id = ${id} and user_id = ${userId} and read_at is null
    returning *
  `;
  if (rows[0]) return mapRow(rows[0]);
  // Already read or not found — return the row
  return getUserNotification(id, userId);
}

export async function markAllRead(userId: string): Promise<number> {
  const rows = await sql<{ cnt: string }[]>`
    with updated as (
      update user_notifications
      set read_at = now()
      where user_id = ${userId} and read_at is null
      returning id
    )
    select count(*)::text as cnt from updated
  `;
  return parseInt(rows[0]?.cnt ?? "0", 10);
}

export async function createUserNotification(input: {
  userId: string;
  title: string;
  body: string;
  sourceType: NotificationSourceType;
  sourceId?: string | null;
  channel?: string | null;
  link?: string | null;
  deliveredAt?: string | null;
}): Promise<UserNotificationRow> {
  const rows = await sql<DbRow[]>`
    insert into user_notifications
      (user_id, title, body, source_type, source_id, channel, link, delivered_at)
    values (
      ${input.userId}, ${input.title}, ${input.body},
      ${input.sourceType}, ${input.sourceId ?? null},
      ${input.channel ?? null}, ${input.link ?? null},
      ${input.deliveredAt ?? null}
    )
    returning *
  `;
  return mapRow(rows[0]);
}

/** Count read notifications for a campaign (for office dashboard) */
export async function countReadByCampaign(campaignId: string): Promise<number> {
  const rows = await sql<{ cnt: string }[]>`
    select count(*)::text as cnt
    from user_notifications
    where source_type = 'campaign' and source_id = ${campaignId} and read_at is not null
  `;
  return parseInt(rows[0]?.cnt ?? "0", 10);
}
