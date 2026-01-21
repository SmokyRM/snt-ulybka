/**
 * ContributionTariff store
 */

import { createId } from "@/lib/mockDb";
import type { ContributionTariff } from "./types";

interface TariffsDb {
  tariffs: ContributionTariff[];
}

const getTariffsDb = (): TariffsDb => {
  const g = globalThis as typeof globalThis & { __SNT_BILLING_TARIFFS_DB__?: TariffsDb };
  if (!g.__SNT_BILLING_TARIFFS_DB__) {
    g.__SNT_BILLING_TARIFFS_DB__ = {
      tariffs: [],
    };
  }
  return g.__SNT_BILLING_TARIFFS_DB__;
};

export function createTariff(data: {
  name: string;
  code: string;
  amount: number;
  unit: ContributionTariff["unit"];
  recurrence: ContributionTariff["recurrence"];
  active?: boolean;
}): ContributionTariff {
  const db = getTariffsDb();
  const now = new Date().toISOString();
  
  // Check for duplicate code
  const existing = db.tariffs.find((t) => t.code === data.code);
  if (existing) {
    throw new Error(`Tariff with code "${data.code}" already exists`);
  }

  const tariff: ContributionTariff = {
    id: createId("tariff"),
    name: data.name,
    code: data.code,
    amount: data.amount,
    unit: data.unit,
    recurrence: data.recurrence,
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  db.tariffs.push(tariff);
  return tariff;
}

export function getTariff(id: string): ContributionTariff | null {
  const db = getTariffsDb();
  return db.tariffs.find((t) => t.id === id) ?? null;
}

export function getTariffByCode(code: string): ContributionTariff | null {
  const db = getTariffsDb();
  return db.tariffs.find((t) => t.code === code) ?? null;
}

export function listTariffs(filters?: {
  active?: boolean | null;
}): ContributionTariff[] {
  const db = getTariffsDb();
  let result = [...db.tariffs];
  if (filters?.active !== null && filters?.active !== undefined) {
    result = result.filter((t) => t.active === filters.active);
  }
  return result.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.code.localeCompare(b.code);
  });
}

export function updateTariff(id: string, updates: Partial<Omit<ContributionTariff, "id" | "createdAt">>): ContributionTariff | null {
  const db = getTariffsDb();
  const index = db.tariffs.findIndex((t) => t.id === id);
  if (index === -1) return null;

  // Check for duplicate code if code is being updated
  if (updates.code && updates.code !== db.tariffs[index].code) {
    const existing = db.tariffs.find((t) => t.code === updates.code && t.id !== id);
    if (existing) {
      throw new Error(`Tariff with code "${updates.code}" already exists`);
    }
  }

  db.tariffs[index] = {
    ...db.tariffs[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return db.tariffs[index];
}

export function deleteTariff(id: string): boolean {
  const db = getTariffsDb();
  const index = db.tariffs.findIndex((t) => t.id === id);
  if (index === -1) return false;
  db.tariffs.splice(index, 1);
  return true;
}