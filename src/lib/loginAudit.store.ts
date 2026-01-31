import { createId } from "@/lib/mockDb";

export type LoginAuditEntry = {
  id: string;
  userId: string | null;
  role: string | null;
  success: boolean;
  method: "password" | "code";
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
};

type LoginAuditDb = {
  entries: LoginAuditEntry[];
};

const getDb = (): LoginAuditDb => {
  const g = globalThis as typeof globalThis & { __SNT_LOGIN_AUDIT_DB__?: LoginAuditDb };
  if (!g.__SNT_LOGIN_AUDIT_DB__) {
    g.__SNT_LOGIN_AUDIT_DB__ = { entries: [] };
  }
  return g.__SNT_LOGIN_AUDIT_DB__;
};

export function logLoginAudit(input: Omit<LoginAuditEntry, "id" | "createdAt">): LoginAuditEntry {
  const db = getDb();
  const entry: LoginAuditEntry = {
    id: createId("login"),
    createdAt: new Date().toISOString(),
    ...input,
  };
  db.entries.push(entry);
  return entry;
}

export function listLoginAudit(filters?: {
  from?: string | null;
  to?: string | null;
  success?: boolean | null;
  role?: string | null;
  limit?: number | null;
  offset?: number | null;
}): { items: LoginAuditEntry[]; total: number } {
  const db = getDb();
  let items = [...db.entries];
  if (filters?.success !== null && filters?.success !== undefined) {
    items = items.filter((entry) => entry.success === filters.success);
  }
  if (filters?.role) {
    items = items.filter((entry) => entry.role === filters.role);
  }
  if (filters?.from) {
    const fromTs = Date.parse(filters.from);
    items = items.filter((entry) => Date.parse(entry.createdAt) >= fromTs);
  }
  if (filters?.to) {
    const toTs = Date.parse(filters.to);
    items = items.filter((entry) => Date.parse(entry.createdAt) <= toTs);
  }
  const total = items.length;
  const offset = Math.max(0, filters?.offset ?? 0);
  const limit = Math.max(1, Math.min(200, filters?.limit ?? 50));
  return { items: items.slice(offset, offset + limit), total };
}
