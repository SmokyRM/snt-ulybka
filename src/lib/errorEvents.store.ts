import { createId } from "@/lib/mockDb";

export type ErrorEventSource = "job" | "api" | "ui";

export type ErrorEvent = {
  id: string;
  source: ErrorEventSource;
  key: string;
  message: string;
  stack: string | null;
  route: string | null;
  requestId: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
};

type ErrorEventsDb = {
  entries: ErrorEvent[];
};

const getDb = (): ErrorEventsDb => {
  const g = globalThis as typeof globalThis & { __SNT_ERROR_EVENTS_DB__?: ErrorEventsDb };
  if (!g.__SNT_ERROR_EVENTS_DB__) {
    g.__SNT_ERROR_EVENTS_DB__ = { entries: [] };
  }
  return g.__SNT_ERROR_EVENTS_DB__;
};

export function logErrorEvent(input: {
  source: ErrorEventSource;
  key: string;
  message: string;
  stack?: string | null;
  route?: string | null;
  requestId?: string | null;
}): ErrorEvent {
  const db = getDb();
  const entry: ErrorEvent = {
    id: createId("error"),
    source: input.source,
    key: input.key,
    message: input.message,
    stack: input.stack ?? null,
    route: input.route ?? null,
    requestId: input.requestId ?? null,
    createdAt: new Date().toISOString(),
    acknowledgedAt: null,
    acknowledgedBy: null,
  };
  db.entries.unshift(entry);
  if (db.entries.length > 1000) {
    db.entries = db.entries.slice(0, 1000);
  }
  return entry;
}

export function listErrorEvents(filters?: {
  source?: ErrorEventSource | null;
  from?: string | null;
  to?: string | null;
  limit?: number | null;
  onlyUnack?: boolean | null;
}): ErrorEvent[] {
  const db = getDb();
  let items = [...db.entries];

  if (filters?.source) {
    items = items.filter((entry) => entry.source === filters.source);
  }
  if (filters?.onlyUnack) {
    items = items.filter((entry) => !entry.acknowledgedAt);
  }
  if (filters?.from) {
    const fromTs = Date.parse(filters.from);
    items = items.filter((entry) => Date.parse(entry.createdAt) >= fromTs);
  }
  if (filters?.to) {
    const toTs = Date.parse(filters.to);
    items = items.filter((entry) => Date.parse(entry.createdAt) <= toTs);
  }

  const limit = Math.max(1, Math.min(200, filters?.limit ?? 50));
  return items.slice(0, limit);
}

export function getErrorEvent(id: string): ErrorEvent | null {
  const db = getDb();
  return db.entries.find((entry) => entry.id === id) ?? null;
}

export function acknowledgeErrorEvent(id: string, acknowledgedBy: string | null): ErrorEvent | null {
  const db = getDb();
  const idx = db.entries.findIndex((entry) => entry.id === id);
  if (idx === -1) return null;
  const updated: ErrorEvent = {
    ...db.entries[idx],
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy,
  };
  db.entries[idx] = updated;
  return updated;
}

export function countErrorEvents(): number {
  return getDb().entries.length;
}
