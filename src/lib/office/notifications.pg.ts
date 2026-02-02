import "server-only";

import { sql } from "@/db/client";
import { createOfficeJob } from "@/lib/office/jobs.store";
import { listDebtorSegments } from "@/lib/office/debtors";
import { findUserById } from "@/lib/mockDb";
import { renderTemplate, getDefaultPlaceholderValues } from "@/lib/notificationTemplates";
import { canSendNotification, recordNotificationSent } from "@/lib/notificationRateLimiter";
import { sendTelegramMessage } from "@/lib/notifications/telegram";

export type NotificationDraftStatus = "draft" | "scheduled" | "sending" | "sent" | "failed" | "canceled";
export type NotificationChannel = "telegram" | "email";
export type NotificationAudience = "debtors" | "all" | "filtered";

export type NotificationDraftPayload = {
  name: string;
  templateKey: string;
  channel: NotificationChannel;
  audience: NotificationAudience;
  filters?: {
    minDebt?: number;
    daysOverdue?: number;
    segment?: string;
    period?: string;
  };
};

export type NotificationDraft = {
  id: string;
  type: string;
  status: NotificationDraftStatus;
  payload: NotificationDraftPayload;
  createdAt: string;
  createdBy: string | null;
  sendAt: string | null;
  canceledAt: string | null;
  idempotencyKey: string | null;
};

export type NotificationJournalRow = {
  id: string;
  draftId: string | null;
  recipient: string;
  channel: NotificationChannel;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  sentAt: string | null;
  templateKey: string | null;
  renderedText: string | null;
  userId: string | null;
  plotId: string | null;
};

type Recipient = {
  plotId: string;
  residentId: string;
  residentName: string;
  plotLabel: string;
  debtAmount: number;
  telegramChatId: string | null;
};

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

const mapDraft = (row: {
  id: string;
  type: string;
  status: NotificationDraftStatus;
  payload: NotificationDraftPayload;
  created_at: string;
  created_by: string | null;
  send_at: string | null;
  canceled_at: string | null;
  idempotency_key: string | null;
}): NotificationDraft => ({
  id: row.id,
  type: row.type,
  status: row.status,
  payload: row.payload,
  createdAt: row.created_at,
  createdBy: row.created_by,
  sendAt: row.send_at,
  canceledAt: row.canceled_at,
  idempotencyKey: row.idempotency_key,
});

const mapJournal = (row: {
  id: string;
  draft_id: string | null;
  recipient: string;
  channel: NotificationChannel;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  sent_at: string | null;
  template_key: string | null;
  rendered_text: string | null;
  user_id: string | null;
  plot_id: string | null;
}): NotificationJournalRow => ({
  id: row.id,
  draftId: row.draft_id,
  recipient: row.recipient,
  channel: row.channel,
  status: row.status,
  error: row.error,
  sentAt: row.sent_at,
  templateKey: row.template_key,
  renderedText: row.rendered_text,
  userId: row.user_id,
  plotId: row.plot_id,
});

const buildRecipients = (payload: NotificationDraftPayload): Recipient[] => {
  const filters = payload.filters ?? {};
  const minDebt = typeof filters.minDebt === "number" ? filters.minDebt : 0;
  const minDaysOverdue = typeof filters.daysOverdue === "number" ? filters.daysOverdue : null;
  const segment = typeof filters.segment === "string" ? filters.segment : null;
  const debts = listDebtorSegments();
  let rows = debts;

  if (payload.audience === "debtors") {
    rows = rows.filter((d) => d.totalDebt > 0);
  }
  if (payload.audience === "filtered") {
    rows = rows.filter((d) => d.totalDebt >= minDebt);
    if (minDaysOverdue !== null) {
      rows = rows.filter((d) => d.overdueDays >= minDaysOverdue);
    }
    if (segment) {
      rows = rows.filter((d) => d.segment === segment);
    }
  }

  return rows.map((row) => {
    const user = findUserById(row.residentId);
    return {
      plotId: row.plotId,
      residentId: row.residentId,
      residentName: row.residentName,
      plotLabel: row.plotLabel,
      debtAmount: row.totalDebt,
      telegramChatId: user?.telegramChatId ?? null,
    };
  });
};

const buildRenderedText = (payload: NotificationDraftPayload, recipient: Recipient) => {
  const values = getDefaultPlaceholderValues({
    residentName: recipient.residentName,
    plotLabel: recipient.plotLabel,
    debtAmount: recipient.debtAmount,
    period: payload.filters?.period ?? undefined,
  });
  const rendered = renderTemplate(payload.templateKey as never, values);
  return rendered?.body ?? "";
};

export async function listDrafts(filters?: { type?: string; status?: NotificationDraftStatus }) {
  const conditions = [] as ReturnType<typeof sql>[];
  if (filters?.type) conditions.push(sql`type = ${filters.type}`);
  if (filters?.status) conditions.push(sql`status = ${filters.status}`);
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const rows = await sql<
    Array<{
      id: string;
      type: string;
      status: NotificationDraftStatus;
      payload: NotificationDraftPayload;
      created_at: string;
      created_by: string | null;
      send_at: string | null;
      canceled_at: string | null;
      idempotency_key: string | null;
    }>
  >`
    select *
    from notification_drafts
    ${where}
    order by created_at desc
  `;
  return rows.map(mapDraft);
}

export async function getDraft(id: string) {
  const rows = await sql<
    Array<{
      id: string;
      type: string;
      status: NotificationDraftStatus;
      payload: NotificationDraftPayload;
      created_at: string;
      created_by: string | null;
      send_at: string | null;
      canceled_at: string | null;
      idempotency_key: string | null;
    }>
  >`
    select *
    from notification_drafts
    where id = ${id}
    limit 1
  `;
  return rows[0] ? mapDraft(rows[0]) : null;
}

export async function createDraft(input: {
  type: string;
  payload: NotificationDraftPayload;
  createdBy: string | null;
  idempotencyKey?: string | null;
}) {
  if (input.idempotencyKey) {
    const existing = await sql<
      Array<{
        id: string;
        type: string;
        status: NotificationDraftStatus;
        payload: NotificationDraftPayload;
        created_at: string;
        created_by: string | null;
        send_at: string | null;
        canceled_at: string | null;
        idempotency_key: string | null;
      }>
    >`
      select *
      from notification_drafts
      where idempotency_key = ${input.idempotencyKey}
      limit 1
    `;
    if (existing[0]) return mapDraft(existing[0]);
  }

  const rows = await sql<
    Array<{
      id: string;
      type: string;
      status: NotificationDraftStatus;
      payload: NotificationDraftPayload;
      created_at: string;
      created_by: string | null;
      send_at: string | null;
      canceled_at: string | null;
      idempotency_key: string | null;
    }>
  >`
    insert into notification_drafts (type, status, payload, created_by, idempotency_key)
    values (${input.type}, 'draft', ${input.payload}, ${input.createdBy}, ${input.idempotencyKey ?? null})
    returning *
  `;
  return mapDraft(rows[0]);
}

export async function scheduleDraft(id: string, sendAt: string) {
  const rows = await sql<
    Array<{
      id: string;
      type: string;
      status: NotificationDraftStatus;
      payload: NotificationDraftPayload;
      created_at: string;
      created_by: string | null;
      send_at: string | null;
      canceled_at: string | null;
      idempotency_key: string | null;
    }>
  >`
    update notification_drafts
    set status = 'scheduled', send_at = ${sendAt}, canceled_at = null
    where id = ${id}
    returning *
  `;
  return rows[0] ? mapDraft(rows[0]) : null;
}

export async function cancelDraft(id: string) {
  const rows = await sql<
    Array<{
      id: string;
      type: string;
      status: NotificationDraftStatus;
      payload: NotificationDraftPayload;
      created_at: string;
      created_by: string | null;
      send_at: string | null;
      canceled_at: string | null;
      idempotency_key: string | null;
    }>
  >`
    update notification_drafts
    set status = 'canceled', canceled_at = now()
    where id = ${id}
    returning *
  `;
  return rows[0] ? mapDraft(rows[0]) : null;
}

export async function previewDraft(payload: NotificationDraftPayload) {
  const recipients = buildRecipients(payload);
  const sample = recipients.slice(0, 3).map((recipient) => ({
    plotId: recipient.plotId,
    residentName: recipient.residentName,
    text: buildRenderedText(payload, recipient),
  }));
  return { targetedCount: recipients.length, sample };
}

export async function sendNow(params: { draftId: string; createdBy: string | null; requestId: string | null }) {
  const draft = await getDraft(params.draftId);
  if (!draft) return { job: null, draft: null };
  if (draft.status === "sent") return { job: null, draft };
  const job = await createOfficeJob({
    type: "notifications.send",
    payload: { draftId: draft.id },
    createdBy: params.createdBy,
    requestId: params.requestId,
  });
  return { job, draft };
}

export async function listJournal(filters?: {
  status?: "sent" | "failed" | "skipped";
  channel?: NotificationChannel;
  draftId?: string | null;
  from?: string;
  to?: string;
}) {
  const conditions = [] as ReturnType<typeof sql>[];
  if (filters?.status) conditions.push(sql`status = ${filters.status}`);
  if (filters?.channel) conditions.push(sql`channel = ${filters.channel}`);
  if (filters?.draftId) conditions.push(sql`draft_id = ${filters.draftId}`);
  if (filters?.from) conditions.push(sql`sent_at >= ${filters.from}`);
  if (filters?.to) conditions.push(sql`sent_at <= ${filters.to}`);
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;

  const rows = await sql<
    Array<{
      id: string;
      draft_id: string | null;
      recipient: string;
      channel: NotificationChannel;
      status: "sent" | "failed" | "skipped";
      error: string | null;
      sent_at: string | null;
      template_key: string | null;
      rendered_text: string | null;
      user_id: string | null;
      plot_id: string | null;
    }>
  >`
    select *
    from notification_journal
    ${where}
    order by created_at desc
    limit 200
  `;
  return rows.map(mapJournal);
}

export async function sendDraft(draftId: string, requestId: string | null) {
  const draft = await getDraft(draftId);
  if (!draft) throw new Error("Draft not found");
  if (draft.status === "sent") {
    return { status: "sent", sent: 0, failed: 0, skipped: 0 };
  }

  await sql`
    update notification_drafts
    set status = 'sending'
    where id = ${draftId}
  `;

  const recipients = buildRecipients(draft.payload);
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const recipient of recipients) {
    const rate = canSendNotification();
    if (!rate.allowed) {
      skipped += 1;
      await sql`
        insert into notification_journal (draft_id, recipient, channel, status, error, sent_at, template_key, rendered_text, user_id, plot_id)
        values (${draftId}, ${recipient.residentName}, ${draft.payload.channel}, 'skipped', 'rate_limited', ${now}, ${draft.payload.templateKey}, ${"Rate limited"}, ${recipient.residentId}, ${recipient.plotId})
      `;
      continue;
    }

    const text = buildRenderedText(draft.payload, recipient);

    if (draft.payload.channel === "telegram") {
      if (!recipient.telegramChatId) {
        skipped += 1;
        await sql`
          insert into notification_journal (draft_id, recipient, channel, status, error, sent_at, template_key, rendered_text, user_id, plot_id)
          values (${draftId}, ${recipient.residentName}, ${draft.payload.channel}, 'skipped', 'missing_chat_id', ${now}, ${draft.payload.templateKey}, ${text}, ${recipient.residentId}, ${recipient.plotId})
        `;
        continue;
      }

      try {
        const result = await sendTelegramMessage(recipient.telegramChatId, text);
        if (!result) {
          skipped += 1;
          await sql`
            insert into notification_journal (draft_id, recipient, channel, status, error, sent_at, template_key, rendered_text, user_id, plot_id)
            values (${draftId}, ${recipient.residentName}, ${draft.payload.channel}, 'skipped', 'token_missing', ${now}, ${draft.payload.templateKey}, ${text}, ${recipient.residentId}, ${recipient.plotId})
          `;
        } else {
          sent += 1;
          recordNotificationSent();
          await sql`
            insert into notification_journal (draft_id, recipient, channel, status, error, sent_at, template_key, rendered_text, user_id, plot_id)
            values (${draftId}, ${recipient.residentName}, ${draft.payload.channel}, 'sent', null, ${now}, ${draft.payload.templateKey}, ${text}, ${recipient.residentId}, ${recipient.plotId})
          `;
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "send_failed";
        await sql`
          insert into notification_journal (draft_id, recipient, channel, status, error, sent_at, template_key, rendered_text, user_id, plot_id)
          values (${draftId}, ${recipient.residentName}, ${draft.payload.channel}, 'failed', ${message}, ${now}, ${draft.payload.templateKey}, ${text}, ${recipient.residentId}, ${recipient.plotId})
        `;
      }
    } else {
      skipped += 1;
      await sql`
        insert into notification_journal (draft_id, recipient, channel, status, error, sent_at, template_key, rendered_text, user_id, plot_id)
        values (${draftId}, ${recipient.residentName}, ${draft.payload.channel}, 'skipped', 'email_not_configured', ${now}, ${draft.payload.templateKey}, ${text}, ${recipient.residentId}, ${recipient.plotId})
      `;
    }
  }

  const status: NotificationDraftStatus = failed > 0 ? "failed" : "sent";
  await sql`
    update notification_drafts
    set status = ${status}
    where id = ${draftId}
  `;

  return { status, sent, failed, skipped };
}
