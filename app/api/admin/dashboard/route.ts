import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import {
  listPlots,
  listAccrualPeriods,
  listAccrualItems,
  listPayments,
  listImportBatches,
} from "@/lib/mockDb";
import { categoryForAccrualType } from "@/lib/paymentCategory";

const currentYearMonth = () => {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
};

const findPeriodByType = (type: string) => {
  const periods = listAccrualPeriods().filter((p) => p.type === type);
  return periods.sort((a, b) => {
    if (a.year === b.year) return b.month - a.month;
    return b.year - a.year;
  })[0];
};

const sumBilling = (type: string) => {
  const period = findPeriodByType(type);
  if (!period) return null;
  const items = listAccrualItems(period.id);
  const accruedSum = items.reduce((s, i) => s + i.amountAccrued, 0);
  const paidSum = listPayments({
    periodId: period.id,
    includeVoided: false,
    category: categoryForAccrualType(type),
  }).reduce((s, p) => s + p.amount, 0);
  const debtSum = accruedSum - paidSum;
  return {
    period: `${period.year}-${String(period.month).padStart(2, "0")}`,
    accruedSum,
    paidSum,
    debtSum,
  };
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const plots = listPlots();
  const registry = {
    totalPlots: plots.length,
    unconfirmedPlots: plots.filter((p) => !p.isConfirmed).length,
    missingContactsPlots: plots.filter((p) => !p.phone && !p.email).length,
  };

  const membership = sumBilling("membership_fee");
  const target = sumBilling("target_fee");
  const electricity = sumBilling("electricity");

  const current = currentYearMonth();
  const missingReadingsCount = 0; // placeholder, нет данных о пропущенных показаниях в mock

  const lastImportBatch = listImportBatches()[0] ?? null;

  const debtorsCalc = (type: "membership_fee" | "electricity") => {
    const period = findPeriodByType(type);
    if (!period) return { count: 0, sumDebt: 0 };
    const items = listAccrualItems(period.id);
    const paidByPlot: Record<string, number> = {};
    listPayments({ periodId: period.id, includeVoided: false, category: categoryForAccrualType(type) }).forEach((p) => {
      paidByPlot[p.plotId] = (paidByPlot[p.plotId] ?? 0) + p.amount;
    });
    let count = 0;
    let sumDebt = 0;
    items.forEach((i) => {
      const debt = i.amountAccrued - (paidByPlot[i.plotId] ?? 0);
      if (debt > 0) {
        count += 1;
        sumDebt += debt;
      }
    });
    return { count, sumDebt };
  };

  return NextResponse.json({
    registry,
    billing: {
      membership,
      target,
    },
    electricity: {
      currentPeriod: electricity?.period ?? `${current.year}-${String(current.month).padStart(2, "0")}`,
      missingReadingsCount,
      totals: electricity,
    },
    imports: {
      lastImportBatch,
    },
    debtors: {
      membership: debtorsCalc("membership_fee"),
      electricity: debtorsCalc("electricity"),
    },
  });
}
