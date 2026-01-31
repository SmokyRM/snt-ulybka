import { createId } from "@/lib/mockDb";

export type CampaignStatus = "draft" | "scheduled" | "sending" | "done" | "failed" | "canceled";
export type CampaignChannel = "telegram" | "email";
export type CampaignAudience = "debtors" | "all" | "filtered";

export type CampaignStats = {
  targetedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
};

export type CampaignFilters = {
  minDebt?: number | null;
  daysOverdue?: number | null;
  segment?: string | null;
  period?: string | null;
  asOf?: string | null;
};

export type Campaign = {
  id: string;
  name: string;
  templateKey: string;
  channel: CampaignChannel;
  audience: CampaignAudience;
  status: CampaignStatus;
  scheduleAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  filters: CampaignFilters;
  stats: CampaignStats;
  lastError: string | null;
};

export type CommunicationStatus = "sent" | "failed" | "skipped";

export type CommunicationLog = {
  id: string;
  userId: string | null;
  plotId: string | null;
  campaignId: string | null;
  channel: CampaignChannel;
  templateKey: string;
  renderedText: string;
  status: CommunicationStatus;
  sentAt: string | null;
  providerMessageId: string | null;
  error: string | null;
  requestId: string | null;
};

type Db = {
  campaigns: Campaign[];
  logs: CommunicationLog[];
};

const getDb = (): Db => {
  const g = globalThis as typeof globalThis & { __SNT_COMMUNICATIONS_DB__?: Db };
  if (!g.__SNT_COMMUNICATIONS_DB__) {
    g.__SNT_COMMUNICATIONS_DB__ = { campaigns: [], logs: [] };
  }
  return g.__SNT_COMMUNICATIONS_DB__;
};

const defaultStats = (): CampaignStats => ({
  targetedCount: 0,
  sentCount: 0,
  failedCount: 0,
  skippedCount: 0,
});

export function createCampaign(input: {
  name: string;
  templateKey: string;
  channel: CampaignChannel;
  audience: CampaignAudience;
  scheduleAt?: string | null;
  createdBy?: string | null;
  filters?: CampaignFilters;
}): Campaign {
  const db = getDb();
  const now = new Date().toISOString();
  const campaign: Campaign = {
    id: createId("camp"),
    name: input.name.trim(),
    templateKey: input.templateKey,
    channel: input.channel,
    audience: input.audience,
    status: "draft",
    scheduleAt: input.scheduleAt ?? null,
    createdBy: input.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
    filters: input.filters ?? {},
    stats: defaultStats(),
    lastError: null,
  };
  db.campaigns.push(campaign);
  return campaign;
}

export function listCampaigns(): Campaign[] {
  const db = getDb();
  return [...db.campaigns].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getCampaign(id: string): Campaign | null {
  const db = getDb();
  return db.campaigns.find((c) => c.id === id) ?? null;
}

export function updateCampaign(id: string, updates: Partial<Campaign>): Campaign | null {
  const db = getDb();
  const idx = db.campaigns.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated: Campaign = {
    ...db.campaigns[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  db.campaigns[idx] = updated;
  return updated;
}

export function scheduleCampaign(id: string, scheduleAt: string): Campaign | null {
  return updateCampaign(id, { scheduleAt, status: "scheduled" });
}

export function cancelCampaign(id: string): Campaign | null {
  return updateCampaign(id, { status: "canceled" });
}

export function duplicateCampaign(id: string, createdBy?: string | null): Campaign | null {
  const campaign = getCampaign(id);
  if (!campaign) return null;
  return createCampaign({
    name: `${campaign.name} (копия)`,
    templateKey: campaign.templateKey,
    channel: campaign.channel,
    audience: campaign.audience,
    createdBy: createdBy ?? campaign.createdBy,
    filters: campaign.filters,
  });
}

export function updateCampaignStats(id: string, stats: Partial<CampaignStats>, lastError?: string | null) {
  const campaign = getCampaign(id);
  if (!campaign) return null;
  const next: CampaignStats = {
    targetedCount: stats.targetedCount ?? campaign.stats.targetedCount,
    sentCount: stats.sentCount ?? campaign.stats.sentCount,
    failedCount: stats.failedCount ?? campaign.stats.failedCount,
    skippedCount: stats.skippedCount ?? campaign.stats.skippedCount,
  };
  return updateCampaign(id, { stats: next, lastError: lastError ?? campaign.lastError });
}

export function addCommunicationLog(input: Omit<CommunicationLog, "id">): CommunicationLog {
  const db = getDb();
  const entry: CommunicationLog = {
    id: createId("comm"),
    ...input,
  };
  db.logs.push(entry);
  return entry;
}

export function listCommunicationLogs(filters?: {
  status?: CommunicationStatus;
  channel?: CampaignChannel;
  campaignId?: string | null;
  from?: string | null;
  to?: string | null;
}): CommunicationLog[] {
  const db = getDb();
  let result = [...db.logs];
  if (filters?.status) {
    result = result.filter((l) => l.status === filters.status);
  }
  if (filters?.channel) {
    result = result.filter((l) => l.channel === filters.channel);
  }
  if (filters?.campaignId) {
    result = result.filter((l) => l.campaignId === filters.campaignId);
  }
  if (filters?.from) {
    const fromTs = Date.parse(filters.from);
    result = result.filter((l) => (l.sentAt ? Date.parse(l.sentAt) >= fromTs : false));
  }
  if (filters?.to) {
    const toTs = Date.parse(filters.to);
    result = result.filter((l) => (l.sentAt ? Date.parse(l.sentAt) <= toTs : false));
  }
  return result.sort((a, b) => Date.parse(b.sentAt ?? b.id) - Date.parse(a.sentAt ?? a.id));
}

export function listCommunicationLogsForUser(userId: string): CommunicationLog[] {
  return listCommunicationLogs().filter((log) => log.userId === userId && log.status === "sent");
}
