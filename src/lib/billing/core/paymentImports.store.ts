/**
 * PaymentImportLog store
 */

import { createId } from "@/lib/mockDb";
import type { PaymentImportLog, PaymentImportError } from "./types";

interface PaymentImportsDb {
  logs: PaymentImportLog[];
  errors: PaymentImportError[];
}

const getPaymentImportsDb = (): PaymentImportsDb => {
  const g = globalThis as typeof globalThis & { __SNT_BILLING_PAYMENT_IMPORTS_DB__?: PaymentImportsDb };
  if (!g.__SNT_BILLING_PAYMENT_IMPORTS_DB__) {
    g.__SNT_BILLING_PAYMENT_IMPORTS_DB__ = {
      logs: [],
      errors: [],
    };
  }
  return g.__SNT_BILLING_PAYMENT_IMPORTS_DB__;
};

// PaymentImportLog CRUD

export function createPaymentImportLog(data: {
  fileName: string;
  status: PaymentImportLog["status"];
  totalRows: number;
  successCount?: number;
  failedCount?: number;
  createdByUserId?: string | null;
}): PaymentImportLog {
  const db = getPaymentImportsDb();
  const now = new Date().toISOString();

  const log: PaymentImportLog = {
    id: createId("import"),
    fileName: data.fileName,
    status: data.status,
    totalRows: data.totalRows,
    successCount: data.successCount ?? 0,
    failedCount: data.failedCount ?? 0,
    createdAt: now,
    completedAt: data.status === "completed" || data.status === "failed" ? now : null,
    error: null,
    createdByUserId: data.createdByUserId ?? null,
  };
  db.logs.unshift(log);
  return log;
}

export function getPaymentImportLog(id: string): PaymentImportLog | null {
  const db = getPaymentImportsDb();
  return db.logs.find((l) => l.id === id) ?? null;
}

export function listPaymentImportLogs(): PaymentImportLog[] {
  const db = getPaymentImportsDb();
  return [...db.logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updatePaymentImportLog(id: string, updates: Partial<Omit<PaymentImportLog, "id" | "createdAt">>): PaymentImportLog | null {
  const db = getPaymentImportsDb();
  const index = db.logs.findIndex((l) => l.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  if (updates.status === "completed" || updates.status === "failed") {
    if (!db.logs[index].completedAt) {
      updates.completedAt = now;
    }
  }

  db.logs[index] = {
    ...db.logs[index],
    ...updates,
  };
  return db.logs[index];
}

export function deletePaymentImportLog(id: string): boolean {
  const db = getPaymentImportsDb();
  const index = db.logs.findIndex((l) => l.id === id);
  if (index === -1) return false;
  db.logs.splice(index, 1);
  // Also delete related errors
  db.errors = db.errors.filter((e) => e.importLogId !== id);
  return true;
}

// PaymentImportError CRUD

export function createPaymentImportError(data: {
  importLogId: string;
  rowIndex: number;
  type: PaymentImportError["type"];
  reason: string;
  rowData: Record<string, string | number | null>;
}): PaymentImportError {
  const db = getPaymentImportsDb();
  const now = new Date().toISOString();

  const error: PaymentImportError = {
    id: createId("error"),
    importLogId: data.importLogId,
    rowIndex: data.rowIndex,
    type: data.type,
    reason: data.reason,
    rowData: data.rowData,
    createdAt: now,
  };
  db.errors.push(error);
  return error;
}

export function getPaymentImportError(id: string): PaymentImportError | null {
  const db = getPaymentImportsDb();
  return db.errors.find((e) => e.id === id) ?? null;
}

export function listPaymentImportErrors(filters?: {
  importLogId?: string | null;
}): PaymentImportError[] {
  const db = getPaymentImportsDb();
  let result = [...db.errors];
  if (filters?.importLogId) {
    result = result.filter((e) => e.importLogId === filters.importLogId);
  }
  return result.sort((a, b) => a.rowIndex - b.rowIndex);
}

export function deletePaymentImportError(id: string): boolean {
  const db = getPaymentImportsDb();
  const index = db.errors.findIndex((e) => e.id === id);
  if (index === -1) return false;
  db.errors.splice(index, 1);
  return true;
}

export function deletePaymentImportErrorsByLog(importLogId: string): number {
  const db = getPaymentImportsDb();
  const initialLength = db.errors.length;
  db.errors = db.errors.filter((e) => e.importLogId !== importLogId);
  return initialLength - db.errors.length;
}