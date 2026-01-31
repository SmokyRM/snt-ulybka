/**
 * Audit Log Store
 * Sprint 23: Centralized audit logging for sensitive operations
 */

import { createId } from "@/lib/mockDb";

export type AuditAction =
  | "penalty.apply"
  | "penalty.recalc"
  | "penalty.void"
  | "penalty.unvoid"
  | "penalty.freeze"
  | "penalty.unfreeze"
  | "allocation.manual"
  | "allocation.unapply"
  | "import.payments"
  | "appeals.remindOverdue";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  actorRole: string;
  requestId: string | null;
  targetType: string;
  targetId: string | null;
  targetIds: string[] | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogInput {
  action: AuditAction;
  actorId: string;
  actorRole: string;
  requestId?: string | null;
  targetType: string;
  targetId?: string | null;
  targetIds?: string[] | null;
  details?: Record<string, unknown>;
}

interface AuditLogDb {
  entries: AuditLogEntry[];
}

const getAuditLogDb = (): AuditLogDb => {
  const g = globalThis as typeof globalThis & { __SNT_AUDIT_LOG_DB__?: AuditLogDb };
  if (!g.__SNT_AUDIT_LOG_DB__) {
    g.__SNT_AUDIT_LOG_DB__ = {
      entries: [],
    };
  }
  return g.__SNT_AUDIT_LOG_DB__;
};

/**
 * Log an audit event
 */
export function logAuditEvent(input: AuditLogInput): AuditLogEntry {
  const db = getAuditLogDb();
  const now = new Date().toISOString();

  const entry: AuditLogEntry = {
    id: createId("audit"),
    action: input.action,
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId ?? null,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    targetIds: input.targetIds ?? null,
    details: input.details ?? {},
    createdAt: now,
  };

  db.entries.push(entry);
  return entry;
}

/**
 * Get audit log entry by ID
 */
export function getAuditLogEntry(id: string): AuditLogEntry | null {
  const db = getAuditLogDb();
  return db.entries.find((e) => e.id === id) ?? null;
}

/**
 * List audit log entries with filters
 */
export function listAuditLog(filters?: {
  action?: AuditAction | null;
  actorId?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number | null;
  offset?: number | null;
}): AuditLogEntry[] {
  const db = getAuditLogDb();
  let result = [...db.entries];

  if (filters?.action) {
    result = result.filter((e) => e.action === filters.action);
  }
  if (filters?.actorId) {
    result = result.filter((e) => e.actorId === filters.actorId);
  }
  if (filters?.actorRole) {
    result = result.filter((e) => e.actorRole === filters.actorRole);
  }
  if (filters?.targetType) {
    result = result.filter((e) => e.targetType === filters.targetType);
  }
  if (filters?.targetId) {
    result = result.filter(
      (e) => e.targetId === filters.targetId || e.targetIds?.includes(filters.targetId!)
    );
  }
  if (filters?.from) {
    const fromTs = new Date(filters.from).getTime();
    result = result.filter((e) => new Date(e.createdAt).getTime() >= fromTs);
  }
  if (filters?.to) {
    const toTs = new Date(filters.to).getTime();
    result = result.filter((e) => new Date(e.createdAt).getTime() <= toTs);
  }

  // Sort by most recent first
  result = result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pagination
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 100;
  result = result.slice(offset, offset + limit);

  return result;
}

/**
 * Get audit log summary
 */
export function getAuditLogSummary(filters?: { from?: string; to?: string }): {
  total: number;
  byAction: Record<AuditAction, number>;
  byRole: Record<string, number>;
} {
  const entries = listAuditLog({ from: filters?.from, to: filters?.to, limit: 10000 });

  const byAction: Record<string, number> = {};
  const byRole: Record<string, number> = {};

  entries.forEach((e) => {
    byAction[e.action] = (byAction[e.action] ?? 0) + 1;
    byRole[e.actorRole] = (byRole[e.actorRole] ?? 0) + 1;
  });

  return {
    total: entries.length,
    byAction: byAction as Record<AuditAction, number>,
    byRole,
  };
}

/**
 * Helper to generate request ID
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
