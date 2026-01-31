/**
 * NotificationDraft store
 * Manages notification drafts for debtor notifications
 */

import { createId } from "@/lib/mockDb";

export type NotificationDraftStatus = "draft" | "approved" | "sending" | "sent" | "failed" | "skipped" | "cancelled";
export type NotificationChannel = "telegram" | "email" | "sms" | "print";
export type NotificationProvider = "telegram";

export interface NotificationDraft {
  id: string;
  plotId: string;
  plotLabel: string;
  residentName: string;
  debtAmount: number;
  channel: NotificationChannel;
  subject: string;
  body: string;
  status: NotificationDraftStatus;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  createdBy: string | null;
  templateId: string | null;
  // Sprint 19: Extended fields for sending
  provider: NotificationProvider | null;
  recipientTgChatId: string | null;
  attempts: number;
  lastError: string | null;
  externalId: string | null;
  skipReason: string | null;
}

export interface NotificationDraftInput {
  plotId: string;
  plotLabel: string;
  residentName: string;
  debtAmount: number;
  channel: NotificationChannel;
  subject: string;
  body: string;
  templateId?: string | null;
  createdBy?: string | null;
  // Sprint 19: Extended fields
  provider?: NotificationProvider | null;
  recipientTgChatId?: string | null;
}

interface NotificationDraftsDb {
  drafts: NotificationDraft[];
}

const getNotificationDraftsDb = (): NotificationDraftsDb => {
  const g = globalThis as typeof globalThis & { __SNT_NOTIFICATION_DRAFTS_DB__?: NotificationDraftsDb };
  if (!g.__SNT_NOTIFICATION_DRAFTS_DB__) {
    g.__SNT_NOTIFICATION_DRAFTS_DB__ = {
      drafts: [],
    };
  }
  return g.__SNT_NOTIFICATION_DRAFTS_DB__;
};

export function createNotificationDraft(input: NotificationDraftInput): NotificationDraft {
  const db = getNotificationDraftsDb();
  const now = new Date().toISOString();

  const draft: NotificationDraft = {
    id: createId("notif"),
    plotId: input.plotId,
    plotLabel: input.plotLabel,
    residentName: input.residentName,
    debtAmount: input.debtAmount,
    channel: input.channel,
    subject: input.subject,
    body: input.body,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    sentAt: null,
    createdBy: input.createdBy ?? null,
    templateId: input.templateId ?? null,
    // Sprint 19: Extended fields
    provider: input.provider ?? null,
    recipientTgChatId: input.recipientTgChatId ?? null,
    attempts: 0,
    lastError: null,
    externalId: null,
    skipReason: null,
  };

  db.drafts.push(draft);
  return draft;
}

export function getNotificationDraft(id: string): NotificationDraft | null {
  const db = getNotificationDraftsDb();
  return db.drafts.find((d) => d.id === id) ?? null;
}

export function listNotificationDrafts(filters?: {
  status?: NotificationDraftStatus | null;
  channel?: NotificationChannel | null;
  plotId?: string | null;
  q?: string | null;
}): NotificationDraft[] {
  const db = getNotificationDraftsDb();
  let result = [...db.drafts];

  if (filters?.status) {
    result = result.filter((d) => d.status === filters.status);
  }
  if (filters?.channel) {
    result = result.filter((d) => d.channel === filters.channel);
  }
  if (filters?.plotId) {
    result = result.filter((d) => d.plotId === filters.plotId);
  }
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    result = result.filter(
      (d) =>
        d.plotLabel.toLowerCase().includes(q) ||
        d.residentName.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q)
    );
  }

  return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function updateNotificationDraft(
  id: string,
  updates: Partial<Omit<NotificationDraft, "id" | "createdAt">>
): NotificationDraft | null {
  const db = getNotificationDraftsDb();
  const index = db.drafts.findIndex((d) => d.id === id);
  if (index === -1) return null;

  db.drafts[index] = {
    ...db.drafts[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return db.drafts[index];
}

export function approveNotificationDraft(id: string): NotificationDraft | null {
  return updateNotificationDraft(id, { status: "approved" });
}

export function markNotificationDraftSent(id: string): NotificationDraft | null {
  return updateNotificationDraft(id, { status: "sent", sentAt: new Date().toISOString() });
}

export function cancelNotificationDraft(id: string): NotificationDraft | null {
  return updateNotificationDraft(id, { status: "cancelled" });
}

export function deleteNotificationDraft(id: string): boolean {
  const db = getNotificationDraftsDb();
  const index = db.drafts.findIndex((d) => d.id === id);
  if (index === -1) return false;
  db.drafts.splice(index, 1);
  return true;
}

export function bulkCreateNotificationDrafts(inputs: NotificationDraftInput[]): NotificationDraft[] {
  return inputs.map((input) => createNotificationDraft(input));
}

export function bulkApproveNotificationDrafts(ids: string[]): { approved: number; failed: number } {
  let approved = 0;
  let failed = 0;
  ids.forEach((id) => {
    const result = approveNotificationDraft(id);
    if (result) {
      approved += 1;
    } else {
      failed += 1;
    }
  });
  return { approved, failed };
}

export function getNotificationDraftsSummary(): {
  total: number;
  draft: number;
  approved: number;
  sending: number;
  sent: number;
  failed: number;
  skipped: number;
  cancelled: number;
} {
  const db = getNotificationDraftsDb();
  const drafts = db.drafts;
  return {
    total: drafts.length,
    draft: drafts.filter((d) => d.status === "draft").length,
    approved: drafts.filter((d) => d.status === "approved").length,
    sending: drafts.filter((d) => d.status === "sending").length,
    sent: drafts.filter((d) => d.status === "sent").length,
    failed: drafts.filter((d) => d.status === "failed").length,
    skipped: drafts.filter((d) => d.status === "skipped").length,
    cancelled: drafts.filter((d) => d.status === "cancelled").length,
  };
}

// Sprint 19: Mark draft as sending
export function markNotificationDraftSending(id: string): NotificationDraft | null {
  return updateNotificationDraft(id, { status: "sending" });
}

// Sprint 19: Mark draft as failed
export function markNotificationDraftFailed(id: string, error: string): NotificationDraft | null {
  const draft = getNotificationDraft(id);
  if (!draft) return null;
  return updateNotificationDraft(id, {
    status: "failed",
    lastError: error,
    attempts: draft.attempts + 1,
  });
}

// Sprint 19: Mark draft as skipped
export function markNotificationDraftSkipped(id: string, reason: string): NotificationDraft | null {
  return updateNotificationDraft(id, { status: "skipped", skipReason: reason });
}

// Sprint 19: Mark draft as sent with external ID
export function markNotificationDraftSentWithId(id: string, externalId: string | null): NotificationDraft | null {
  return updateNotificationDraft(id, {
    status: "sent",
    sentAt: new Date().toISOString(),
    externalId,
  });
}

// Sprint 19: Get drafts ready to send (approved status with valid recipient)
export function listDraftsReadyToSend(filters?: {
  channel?: NotificationChannel | null;
  limit?: number;
}): NotificationDraft[] {
  const db = getNotificationDraftsDb();
  let result = db.drafts.filter((d) => d.status === "approved");

  if (filters?.channel) {
    result = result.filter((d) => d.channel === filters.channel);
  }

  result = result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (filters?.limit && filters.limit > 0) {
    result = result.slice(0, filters.limit);
  }

  return result;
}
