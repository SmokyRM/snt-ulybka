import { listAccrualItems, listAccrualPeriods, listPayments } from "@/lib/mockDb";
import { categoryForAccrualType } from "@/lib/paymentCategory";

export type CollectionPoint = {
  period: string; // YYYY-MM
  membership: { accrued: number; paid: number; debt: number };
  target: { accrued: number; paid: number; debt: number };
  electricity: { accrued: number; paid: number; debt: number };
  spent?: number;
  balance?: number;
};

const parsePeriod = (value: string | null | undefined) => {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
};

const iterateMonths = (from: { year: number; month: number }, to: { year: number; month: number }) => {
  const months: Array<{ year: number; month: number }> = [];
  let y = from.year;
  let m = from.month;
  while (y < to.year || (y === to.year && m <= to.month)) {
    months.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
};

export const getCollectionsAnalytics = (params: { from: string | null; to: string | null }): { points: CollectionPoint[] } => {
  const fromParsed = parsePeriod(params.from);
  const toParsed = parsePeriod(params.to);
  if (!fromParsed || !toParsed) return { points: [] };

  const periods = listAccrualPeriods();
  const payments = listPayments({ includeVoided: false });

  const points = iterateMonths(fromParsed, toParsed).map(({ year, month }) => {
    const periodKey = `${year}-${String(month).padStart(2, "0")}`;
    const aggForType = (type: "membership_fee" | "target_fee" | "electricity") => {
      const period = periods.find((p) => p.year === year && p.month === month && p.type === type);
      const accrued = period
        ? listAccrualItems(period.id).reduce((s, i) => s + i.amountAccrued, 0)
        : 0;
      const paid = period
        ? payments
            .filter((p) => p.periodId === period.id && p.category === categoryForAccrualType(type))
            .reduce((s, p) => s + p.amount, 0)
        : 0;
      const debt = accrued - paid;
      return { accrued, paid, debt };
    };

    return {
      period: periodKey,
      membership: aggForType("membership_fee"),
      target: aggForType("target_fee"),
      electricity: aggForType("electricity"),
    };
  });

  return { points };
};

export const withTotals = (points: CollectionPoint[]) => {
  const totals = points.reduce(
    (acc, p) => {
      acc.membership.accrued += p.membership.accrued;
      acc.membership.paid += p.membership.paid;
      acc.membership.debt += p.membership.debt;
      acc.target.accrued += p.target.accrued;
      acc.target.paid += p.target.paid;
      acc.target.debt += p.target.debt;
      acc.electricity.accrued += p.electricity.accrued;
      acc.electricity.paid += p.electricity.paid;
      acc.electricity.debt += p.electricity.debt;
      acc.all.accrued += p.membership.accrued + p.target.accrued + p.electricity.accrued;
      acc.all.paid += p.membership.paid + p.target.paid + p.electricity.paid;
      acc.all.debt += p.membership.debt + p.target.debt + p.electricity.debt;
      return acc;
    },
    {
      membership: { accrued: 0, paid: 0, debt: 0 },
      target: { accrued: 0, paid: 0, debt: 0 },
      electricity: { accrued: 0, paid: 0, debt: 0 },
      all: { accrued: 0, paid: 0, debt: 0 },
    }
  );
  return { points, totals };
};
