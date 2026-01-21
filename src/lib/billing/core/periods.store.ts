/**
 * BillingPeriod store
 */

import { createId } from "@/lib/mockDb";
import type { BillingPeriod, PeriodStatus } from "./types";

interface PeriodsDb {
  periods: BillingPeriod[];
}

const getPeriodsDb = (): PeriodsDb => {
  const g = globalThis as typeof globalThis & { __SNT_BILLING_PERIODS_DB__?: PeriodsDb };
  if (!g.__SNT_BILLING_PERIODS_DB__) {
    g.__SNT_BILLING_PERIODS_DB__ = {
      periods: [],
    };
  }
  return g.__SNT_BILLING_PERIODS_DB__;
};

export function createPeriod(data: {
  year: number;
  month: number;
  status?: PeriodStatus;
}): BillingPeriod {
  const db = getPeriodsDb();
  const now = new Date().toISOString();

  // Check for duplicate period
  const existing = db.periods.find((p) => p.year === data.year && p.month === data.month);
  if (existing) {
    throw new Error(`Period ${data.year}-${String(data.month).padStart(2, "0")} already exists`);
  }

  // Validate month
  if (data.month < 1 || data.month > 12) {
    throw new Error("Month must be between 1 and 12");
  }

  const period: BillingPeriod = {
    id: createId("period"),
    year: data.year,
    month: data.month,
    status: data.status ?? "open",
    createdAt: now,
    updatedAt: now,
  };
  db.periods.push(period);
  return period;
}

export function getPeriod(id: string): BillingPeriod | null {
  const db = getPeriodsDb();
  return db.periods.find((p) => p.id === id) ?? null;
}

export function getPeriodByYearMonth(year: number, month: number): BillingPeriod | null {
  const db = getPeriodsDb();
  return db.periods.find((p) => p.year === year && p.month === month) ?? null;
}

export function listPeriods(filters?: {
  status?: PeriodStatus | null;
  year?: number | null;
}): BillingPeriod[] {
  const db = getPeriodsDb();
  let result = [...db.periods];
  if (filters?.status) {
    result = result.filter((p) => p.status === filters.status);
  }
  if (filters?.year !== null && filters?.year !== undefined) {
    result = result.filter((p) => p.year === filters.year);
  }
  return result.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

export function updatePeriod(id: string, updates: Partial<Omit<BillingPeriod, "id" | "createdAt">>): BillingPeriod | null {
  const db = getPeriodsDb();
  const index = db.periods.findIndex((p) => p.id === id);
  if (index === -1) return null;

  // If year/month is being updated, check for duplicates
  if ((updates.year !== undefined || updates.month !== undefined) && 
      (updates.year !== db.periods[index].year || updates.month !== db.periods[index].month)) {
    const newYear = updates.year ?? db.periods[index].year;
    const newMonth = updates.month ?? db.periods[index].month;
    const existing = db.periods.find((p) => p.year === newYear && p.month === newMonth && p.id !== id);
    if (existing) {
      throw new Error(`Period ${newYear}-${String(newMonth).padStart(2, "0")} already exists`);
    }
  }

  // Validate month if being updated
  if (updates.month !== undefined && (updates.month < 1 || updates.month > 12)) {
    throw new Error("Month must be between 1 and 12");
  }

  db.periods[index] = {
    ...db.periods[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return db.periods[index];
}

export function deletePeriod(id: string): boolean {
  const db = getPeriodsDb();
  const index = db.periods.findIndex((p) => p.id === id);
  if (index === -1) return false;
  db.periods.splice(index, 1);
  return true;
}