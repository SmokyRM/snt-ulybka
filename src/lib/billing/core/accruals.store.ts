/**
 * Accrual store
 */

import { createId } from "@/lib/mockDb";
import type { Accrual, AccrualStatus } from "./types";

interface AccrualsDb {
  accruals: Accrual[];
}

const getAccrualsDb = (): AccrualsDb => {
  const g = globalThis as typeof globalThis & { __SNT_BILLING_ACCRUALS_DB__?: AccrualsDb };
  if (!g.__SNT_BILLING_ACCRUALS_DB__) {
    g.__SNT_BILLING_ACCRUALS_DB__ = {
      accruals: [],
    };
  }
  return g.__SNT_BILLING_ACCRUALS_DB__;
};

export function createAccrual(data: {
  periodId: string;
  plotId: string;
  tariffId: string;
  amount: number;
  status?: AccrualStatus;
}): Accrual {
  const db = getAccrualsDb();
  const now = new Date().toISOString();

  // Check for duplicate (periodId, plotId, tariffId)
  const existing = db.accruals.find(
    (a) => a.periodId === data.periodId && a.plotId === data.plotId && a.tariffId === data.tariffId
  );
  if (existing) {
    throw new Error(
      `Accrual already exists for period ${data.periodId}, plot ${data.plotId}, tariff ${data.tariffId}`
    );
  }

  const accrual: Accrual = {
    id: createId("accrual"),
    periodId: data.periodId,
    plotId: data.plotId,
    tariffId: data.tariffId,
    amount: data.amount,
    status: data.status ?? "pending",
    createdAt: now,
  };
  db.accruals.push(accrual);
  return accrual;
}

export function getAccrual(id: string): Accrual | null {
  const db = getAccrualsDb();
  return db.accruals.find((a) => a.id === id) ?? null;
}

export function listAccruals(filters?: {
  periodId?: string | null;
  plotId?: string | null;
  tariffId?: string | null;
  status?: AccrualStatus | null;
}): Accrual[] {
  const db = getAccrualsDb();
  let result = [...db.accruals];
  if (filters?.periodId) {
    result = result.filter((a) => a.periodId === filters.periodId);
  }
  if (filters?.plotId) {
    result = result.filter((a) => a.plotId === filters.plotId);
  }
  if (filters?.tariffId) {
    result = result.filter((a) => a.tariffId === filters.tariffId);
  }
  if (filters?.status) {
    result = result.filter((a) => a.status === filters.status);
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateAccrual(id: string, updates: Partial<Omit<Accrual, "id" | "createdAt">>): Accrual | null {
  const db = getAccrualsDb();
  const index = db.accruals.findIndex((a) => a.id === id);
  if (index === -1) return null;

  db.accruals[index] = {
    ...db.accruals[index],
    ...updates,
  };
  return db.accruals[index];
}

export function deleteAccrual(id: string): boolean {
  const db = getAccrualsDb();
  const index = db.accruals.findIndex((a) => a.id === id);
  if (index === -1) return false;
  db.accruals.splice(index, 1);
  return true;
}

export function deleteAccrualsByPeriod(periodId: string): number {
  const db = getAccrualsDb();
  const initialLength = db.accruals.length;
  db.accruals = db.accruals.filter((a) => a.periodId !== periodId);
  return initialLength - db.accruals.length;
}