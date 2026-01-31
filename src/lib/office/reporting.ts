import "server-only";

import { listCharges, listPayments } from "@/lib/billing.store";
import { listAppeals as listAppealsStore } from "@/lib/appeals.store";

type MonthlyAggregate = {
  period: string;
  accrued: number;
  paid: number;
  debtEnd: number;
  paymentsCount: number;
};

type MonthlyReport = {
  period: string;
  totals: {
    accrued: number;
    paid: number;
    debt: number;
    penalty: number;
  };
  categories: Array<{ label: string; amount: number }>;
  appeals: {
    total: number;
    new: number;
    inProgress: number;
    closed: number;
  };
};

const formatPeriod = (date: Date) => date.toISOString().slice(0, 7);

const parsePeriod = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return null;
  return new Date(Date.UTC(year, month - 1, 1));
};

const getDefaultRange = () => {
  const now = new Date();
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  return { from, to };
};

const buildRange = (fromParam?: string | null, toParam?: string | null) => {
  const defaults = getDefaultRange();
  const from = fromParam ? parsePeriod(fromParam) : defaults.from;
  const to = toParam ? parsePeriod(toParam) : defaults.to;
  if (!from || !to) return defaults;
  return from > to ? { from: to, to: from } : { from, to };
};

export const buildMonthlyAggregates = (fromParam?: string | null, toParam?: string | null): MonthlyAggregate[] => {
  const { from, to } = buildRange(fromParam, toParam);
  const months: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    months.push(formatPeriod(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const accruedMap: Record<string, number> = {};
  const paidMap: Record<string, number> = {};
  const paymentsCountMap: Record<string, number> = {};

  listCharges().forEach((charge) => {
    const period = charge.period ?? charge.date.slice(0, 7);
    if (!months.includes(period)) return;
    accruedMap[period] = (accruedMap[period] ?? 0) + charge.amount;
  });

  listPayments().forEach((payment) => {
    const period = payment.date.slice(0, 7);
    if (!months.includes(period)) return;
    paidMap[period] = (paidMap[period] ?? 0) + payment.amount;
    paymentsCountMap[period] = (paymentsCountMap[period] ?? 0) + 1;
  });

  let runningDebt = 0;
  return months.map((period) => {
    const accrued = accruedMap[period] ?? 0;
    const paid = paidMap[period] ?? 0;
    runningDebt += accrued - paid;
    return {
      period,
      accrued,
      paid,
      debtEnd: runningDebt,
      paymentsCount: paymentsCountMap[period] ?? 0,
    };
  });
};

export const buildMonthlyReport = (periodParam: string): MonthlyReport => {
  const periodDate = parsePeriod(periodParam) ?? new Date();
  const period = formatPeriod(periodDate);

  const charges = listCharges().filter((charge) => (charge.period ?? charge.date.slice(0, 7)) === period);
  const payments = listPayments().filter((payment) => payment.date.slice(0, 7) === period);

  const accrued = charges.reduce((sum, item) => sum + item.amount, 0);
  const paid = payments.reduce((sum, item) => sum + item.amount, 0);
  const debt = accrued - paid;

  const categoriesMap: Record<string, number> = {};
  charges.forEach((charge) => {
    const key = charge.category ?? "other";
    categoriesMap[key] = (categoriesMap[key] ?? 0) + charge.amount;
  });
  const categories = Object.entries(categoriesMap).map(([label, amount]) => ({ label, amount }));

  const appeals = listAppealsStore().filter((appeal) => appeal.createdAt.slice(0, 7) === period);
  const appealsSummary = {
    total: appeals.length,
    new: appeals.filter((a) => a.status === "new").length,
    inProgress: appeals.filter((a) => a.status === "in_progress").length,
    closed: appeals.filter((a) => a.status === "closed").length,
  };

  return {
    period,
    totals: {
      accrued,
      paid,
      debt,
      penalty: 0,
    },
    categories,
    appeals: appealsSummary,
  };
};
