/**
 * Import Session Store for registry CSV import
 * Stores CSV rows with errors for inline editing
 * TTL: 30 minutes
 */

export interface ImportSessionRow {
  rowIndex: number; // 1-based CSV row index
  fullName?: string;
  phone?: string | null;
  email?: string | null;
  sntStreetNumber?: string;
  plotNumber?: string;
  cityAddress?: string | null;
  note?: string | null;
  errors: string[]; // Validation errors for this row
}

export interface ImportSession {
  id: string;
  createdAt: string;
  expiresAt: string; // createdAt + 30 minutes
  rows: ImportSessionRow[];
  summary: {
    totalRows: number;
    errorRows: number;
    validRows: number;
  };
}

// In-memory store with TTL
declare global {
  // eslint-disable-next-line no-var
  var __SNT_IMPORT_SESSIONS_DB__: Map<string, ImportSession> | undefined;
}

function getDb(): Map<string, ImportSession> {
  if (!globalThis.__SNT_IMPORT_SESSIONS_DB__) {
    globalThis.__SNT_IMPORT_SESSIONS_DB__ = new Map();
  }
  // Cleanup expired sessions
  const now = Date.now();
  const db = globalThis.__SNT_IMPORT_SESSIONS_DB__;
  for (const [id, session] of db.entries()) {
    if (new Date(session.expiresAt).getTime() < now) {
      db.delete(id);
    }
  }
  return db;
}

function createSessionId(): string {
  return `import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSession(rows: ImportSessionRow[]): ImportSession {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

  const session: ImportSession = {
    id: createSessionId(),
    createdAt: now,
    expiresAt,
    rows,
    summary: {
      totalRows: rows.length,
      errorRows: rows.filter((r) => r.errors.length > 0).length,
      validRows: rows.filter((r) => r.errors.length === 0).length,
    },
  };

  getDb().set(session.id, session);
  return session;
}

export function getSession(sessionId: string): ImportSession | null {
  const session = getDb().get(sessionId);
  if (!session) return null;

  // Check if expired
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    getDb().delete(sessionId);
    return null;
  }

  return session;
}

export function patchSessionRow(
  sessionId: string,
  rowIndex: number,
  patch: Partial<Omit<ImportSessionRow, "rowIndex" | "errors">>
): ImportSession | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const row = session.rows.find((r) => r.rowIndex === rowIndex);
  if (!row) return null;

  // Apply patch
  Object.assign(row, patch);

  // Normalize sntStreetNumber if provided
  if (patch.sntStreetNumber !== undefined && patch.sntStreetNumber) {
    const normalized = normalizeStreetNumber(patch.sntStreetNumber);
    if (normalized) {
      row.sntStreetNumber = normalized;
    }
  }

  // Re-validate row and update errors
  row.errors = validateRow(row);

  // Recalculate summary
  session.summary = {
    totalRows: session.rows.length,
    errorRows: session.rows.filter((r) => r.errors.length > 0).length,
    validRows: session.rows.filter((r) => r.errors.length === 0).length,
  };

  // Update session in store
  getDb().set(sessionId, session);
  return session;
}

function validateRow(row: ImportSessionRow): string[] {
  const errors: string[] = [];

  if (!row.fullName || row.fullName.trim().length === 0) {
    errors.push("Отсутствует ФИО");
  }

  // Validate street number (should already be normalized)
  if (!row.sntStreetNumber || row.sntStreetNumber.trim().length === 0) {
    errors.push("Отсутствует номер улицы");
  }

  if (!row.plotNumber || row.plotNumber.trim().length === 0) {
    errors.push("Отсутствует номер участка");
  }

  return errors;
}

// Normalize street number (same logic as in csvParser)
function normalizeStreetNumber(street: string | undefined): string | null {
  if (!street) return null;
  const trimmed = street.trim();
  if (!trimmed) return null;
  
  const match = trimmed.match(/\d+/);
  if (match) {
    const number = parseInt(match[0], 10).toString();
    return number;
  }
  
  return null;
}

export function deleteSession(sessionId: string): boolean {
  return getDb().delete(sessionId);
}
