import { listCharges, listPayments } from "@/lib/billing.store";
import { getPenaltyAccrualsSummary } from "@/lib/penaltyAccruals.store";

export type PeriodCloseSnapshot = {
  accruedTotal: number;
  paidTotal: number;
  debtTotal: number;
  penaltyTotal: number;
  paymentsCount: number;
  debtorsCount: number;
};

export type PeriodCloseRecord = {
  period: string;
  status: "open" | "closed";
  closedAt: string | null;
  closedBy: string | null;
  snapshot: PeriodCloseSnapshot | null;
};

type PeriodCloseDb = {
  records: PeriodCloseRecord[];
};

const getDb = (): PeriodCloseDb => {
  const g = globalThis as typeof globalThis & { __SNT_PERIOD_CLOSE_DB__?: PeriodCloseDb };
  if (!g.__SNT_PERIOD_CLOSE_DB__) {
    g.__SNT_PERIOD_CLOSE_DB__ = { records: [] };
  }
  return g.__SNT_PERIOD_CLOSE_DB__;
};

const getPeriodRange = (period: string) => {
  const [y, m] = period.split("-").map((v) => Number(v));
  if (!y || !m) return null;
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 0, 23, 59, 59));
  return { from, to };
};

export function computePeriodAggregates(period: string): PeriodCloseSnapshot {
  const range = getPeriodRange(period);
  if (!range) {
    return { accruedTotal: 0, paidTotal: 0, debtTotal: 0, penaltyTotal: 0, paymentsCount: 0, debtorsCount: 0 };
  }
  const { from, to } = range;
  const accruals = listCharges().filter((c) => (c.period ?? c.date.slice(0, 7)) === period);
  const payments = listPayments().filter((p) => {
    const ts = new Date(p.date).getTime();
    return ts >= from.getTime() && ts <= to.getTime();
  });

  const accruedTotal = accruals.reduce((sum, c) => sum + c.amount, 0);
  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const debtTotal = accruedTotal - paidTotal;
  const paymentsCount = payments.length;

  const byResident: Record<string, { accrued: number; paid: number }> = {};
  accruals.forEach((c) => {
    if (!byResident[c.residentId]) byResident[c.residentId] = { accrued: 0, paid: 0 };
    byResident[c.residentId].accrued += c.amount;
  });
  payments.forEach((p) => {
    if (!byResident[p.residentId]) byResident[p.residentId] = { accrued: 0, paid: 0 };
    byResident[p.residentId].paid += p.amount;
  });
  const debtorsCount = Object.values(byResident).filter((v) => v.accrued - v.paid > 0).length;

  const penaltySummary = getPenaltyAccrualsSummary({ period });
  const penaltyTotal = penaltySummary.activeAmount;

  return { accruedTotal, paidTotal, debtTotal, penaltyTotal, paymentsCount, debtorsCount };
}

export function getPeriodClose(period: string): PeriodCloseRecord | null {
  const db = getDb();
  return db.records.find((r) => r.period === period) ?? null;
}

export function listPeriodCloses(): PeriodCloseRecord[] {
  const db = getDb();
  return [...db.records].sort((a, b) => a.period.localeCompare(b.period));
}

export function closePeriod(params: { period: string; closedBy: string | null }): PeriodCloseRecord {
  const db = getDb();
  const existing = getPeriodClose(params.period);
  if (existing && existing.status === "closed") {
    return existing;
  }
  const snapshot = computePeriodAggregates(params.period);
  const record: PeriodCloseRecord = {
    period: params.period,
    status: "closed",
    closedAt: new Date().toISOString(),
    closedBy: params.closedBy ?? null,
    snapshot,
  };
  if (existing) {
    const idx = db.records.findIndex((r) => r.period === params.period);
    db.records[idx] = record;
  } else {
    db.records.push(record);
  }
  return record;
}

export function isPeriodClosed(period: string): boolean {
  const record = getPeriodClose(period);
  return record?.status === "closed";
}

export function assertPeriodOpenOrReason(period: string, reason?: string | null) {
  if (!isPeriodClosed(period)) return { closed: false } as const;
  if (!reason || !reason.trim()) {
    throw new Error("Период закрыт. Укажите причину изменения.");
  }
  return { closed: true, reason: reason.trim() } as const;
}

export function assertPeriodsOpenOrReason(periods: string[], reason?: string | null) {
  const closedPeriods = periods.filter((p) => isPeriodClosed(p));
  if (closedPeriods.length === 0) return { closed: false, periods: [] as string[] } as const;
  if (!reason || !reason.trim()) {
    throw new Error("Период закрыт. Укажите причину изменения.");
  }
  return { closed: true, periods: closedPeriods, reason: reason.trim() } as const;
}
