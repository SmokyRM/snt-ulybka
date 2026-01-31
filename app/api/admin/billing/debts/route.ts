import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import {
  getDb,
  listUnifiedBillingPeriods,
  listPlots,
  findDebtRepaymentPlanByPlotPeriod,
} from "@/lib/mockDb";
import { buildPeriodReconciliation } from "@/lib/billing/unifiedReconciliation.server";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";

export type PlotDebtRow = {
  plotId: string;
  plotNumber: string;
  street: string;
  fullName: string;
  phone: string;
  debtMembership: number;
  debtTarget: number;
  debtElectric: number;
  debtTotal: number;
  accruedTotal: number;
  paidTotal: number;
  overdueDays: number;
  repaymentPlan?: {
    id: string;
    status: string;
    comment: string | null;
    agreedAmount: number | null;
    agreedDate: string | null;
  } | null;
};

export type PersonDebtRow = {
  personId: string;
  fullName: string;
  phone: string;
  plotCount: number;
  debtTotal: number;
  accruedTotal: number;
  paidTotal: number;
  overdueDays: number;
};

type DebtTotals = {
  count: number;
  sumMembership: number;
  sumTarget: number;
  sumElectric: number;
  sumTotal: number;
};

const statusOk = (s: string | undefined) => ["draft", "locked", "approved", "closed"].includes(s ?? "");

function daysFromTo(toDate: string): number {
  const to = new Date(toDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - to.getTime()) / 86400000));
}

const emptyResponseData = (mode: "plots" | "people") => ({
  items: mode === "plots" ? ([] as PlotDebtRow[]) : ([] as PersonDebtRow[]),
  totals: { count: 0, sumMembership: 0, sumTarget: 0, sumElectric: 0, sumTotal: 0 },
  period: null,
  mode,
});

export async function GET(request: Request) {
  try {
    const accessCheck = await checkAdminOrOfficeAccess(request);
    if (!accessCheck.allowed) {
      return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("periodId") || null;
    const mode = searchParams.get("mode") === "people" ? "people" : "plots";

    const allPeriods = listUnifiedBillingPeriods();
    const periods = periodId
      ? allPeriods.filter((p) => p.id === periodId)
      : allPeriods.filter((p) => statusOk(p.status));

    if (periods.length === 0) return ok(request, emptyResponseData(mode));

  const selectedPeriod = periodId ? periods[0] ?? null : null;
  const plots = listPlots() ?? [];
  const db = getDb();
  const plotOwners = db.plotOwners ?? [];
  const persons = db.persons ?? [];

  type PlotAgg = {
    accruedM: number;
    accruedT: number;
    accruedE: number;
    paidM: number;
    paidT: number;
    paidE: number;
    minPeriodTo: string | null;
  };
  const plotAgg = new Map<string, PlotAgg>();

  function getPlotAgg(plotId: string): PlotAgg {
    let a = plotAgg.get(plotId);
    if (!a) {
      a = { accruedM: 0, accruedT: 0, accruedE: 0, paidM: 0, paidT: 0, paidE: 0, minPeriodTo: null };
      plotAgg.set(plotId, a);
    }
    return a;
  }

  for (const p of periods) {
    const reconciliation = buildPeriodReconciliation(p);
    const periodTo = p.to ?? "";

    reconciliation.rows.forEach((row) => {
      const agg = getPlotAgg(row.plotId);
      agg.accruedM += row.byType.membership.accrued;
      agg.accruedT += row.byType.target.accrued;
      agg.accruedE += row.byType.electric.accrued;
      agg.paidM += row.byType.membership.paid;
      agg.paidT += row.byType.target.paid;
      agg.paidE += row.byType.electric.paid;
      const debtThis = Math.max(0, row.byType.membership.debt)
        + Math.max(0, row.byType.target.debt)
        + Math.max(0, row.byType.electric.debt);
      if (debtThis > 0 && periodTo && (!agg.minPeriodTo || periodTo < agg.minPeriodTo)) {
        agg.minPeriodTo = periodTo;
      }
    });
  }

  if (mode === "people") {
    type PersonAgg = {
      fullName: string;
      phone: string;
      plotIds: Set<string>;
      debtTotal: number;
      accruedTotal: number;
      paidTotal: number;
      minPeriodTo: string | null;
    };
    const personMap = new Map<string, PersonAgg>();

    function getPerson(key: string, fullName: string, phone: string): PersonAgg {
      let v = personMap.get(key);
      if (!v) {
        v = {
          fullName,
          phone,
          plotIds: new Set(),
          debtTotal: 0,
          accruedTotal: 0,
          paidTotal: 0,
          minPeriodTo: null,
        };
        personMap.set(key, v);
      }
      return v;
    }

    for (const plot of plots) {
      const agg = plotAgg.get(plot.id);
      if (!agg) continue;

      const debtM = Math.max(0, agg.accruedM - agg.paidM);
      const debtT = Math.max(0, agg.accruedT - agg.paidT);
      const debtE = Math.max(0, agg.accruedE - agg.paidE);
      const debtTotal = debtM + debtT + debtE;
      const accruedTotal = agg.accruedM + agg.accruedT + agg.accruedE;
      const paidTotal = agg.paidM + agg.paidT + agg.paidE;

      const po = plotOwners.find((o) => o.plotNumber === plot.plotNumber);
      const person = po?.userIdentifier ? persons.find((x) => x.id === po.userIdentifier) : null;

      let key: string;
      let fullName: string;
      let phone: string;
      if (person) {
        key = person.id;
        fullName = person.fullName ?? plot.ownerFullName ?? "—";
        phone = (person.phone ?? plot.phone ?? "").trim() || "";
      } else {
        key = `fallback:${(plot.ownerFullName ?? "").trim()}|${(plot.phone ?? "").replace(/\D/g, "")}`;
        fullName = plot.ownerFullName ?? "—";
        phone = (plot.phone ?? "").trim() || "";
      }

      const v = getPerson(key, fullName, phone);
      v.plotIds.add(plot.id);
      v.debtTotal += debtTotal;
      v.accruedTotal += accruedTotal;
      v.paidTotal += paidTotal;
      if (agg.minPeriodTo && (!v.minPeriodTo || agg.minPeriodTo < v.minPeriodTo)) {
        v.minPeriodTo = agg.minPeriodTo;
      }
    }

    const items: PersonDebtRow[] = Array.from(personMap.entries())
      .filter(([, v]) => v.debtTotal > 0 || v.accruedTotal > 0 || v.paidTotal > 0)
      .map(([personId, v]) => ({
        personId,
        fullName: v.fullName,
        phone: v.phone,
        plotCount: v.plotIds.size,
        debtTotal: v.debtTotal,
        accruedTotal: v.accruedTotal,
        paidTotal: v.paidTotal,
        overdueDays: v.minPeriodTo ? daysFromTo(v.minPeriodTo) : 0,
      }));

    items.sort((a, b) => b.debtTotal - a.debtTotal);

    const totals: DebtTotals = items.reduce(
      (acc, i) => {
        acc.sumTotal += i.debtTotal;
        acc.count += i.debtTotal > 0 ? 1 : 0;
        return acc;
      },
      { count: 0, sumMembership: 0, sumTarget: 0, sumElectric: 0, sumTotal: 0 }
    );

      return ok(request, {
        items,
        totals,
        period: selectedPeriod
          ? {
              id: selectedPeriod.id,
              from: selectedPeriod.from,
              to: selectedPeriod.to,
              title: selectedPeriod.title,
              status: selectedPeriod.status,
            }
          : null,
        mode: "people" as const,
      });
    }

  // mode === "plots"
  const plotRows: PlotDebtRow[] = plots.map((plot) => {
    const agg = plotAgg.get(plot.id) || {
      accruedM: 0,
      accruedT: 0,
      accruedE: 0,
      paidM: 0,
      paidT: 0,
      paidE: 0,
      minPeriodTo: null,
    };

    const debtMembership = Math.max(0, agg.accruedM - agg.paidM);
    const debtTarget = Math.max(0, agg.accruedT - agg.paidT);
    const debtElectric = Math.max(0, agg.accruedE - agg.paidE);
    const debtTotal = debtMembership + debtTarget + debtElectric;
    const accruedTotal = agg.accruedM + agg.accruedT + agg.accruedE;
    const paidTotal = agg.paidM + agg.paidT + agg.paidE;
    const overdueDays = agg.minPeriodTo ? daysFromTo(agg.minPeriodTo) : 0;

    const po = plotOwners.find((o) => o.plotNumber === plot.plotNumber);
    const person = po?.userIdentifier ? persons.find((x) => x.id === po.userIdentifier) : null;
    const fullName = person?.fullName ?? plot.ownerFullName ?? "—";
    const phone = (person?.phone ?? plot.phone ?? "").trim() || "";

    const repaymentPlan =
      selectedPeriod != null ? findDebtRepaymentPlanByPlotPeriod(plot.id, selectedPeriod.id) : null;

    return {
      plotId: plot.id,
      plotNumber: plot.plotNumber ?? "—",
      street: plot.street ?? "—",
      fullName,
      phone,
      debtMembership,
      debtTarget,
      debtElectric,
      debtTotal,
      accruedTotal,
      paidTotal,
      overdueDays,
      repaymentPlan: repaymentPlan
        ? {
            id: repaymentPlan.id,
            status: repaymentPlan.status as string,
            comment: repaymentPlan.comment ?? null,
            agreedAmount: repaymentPlan.agreedAmount ?? null,
            agreedDate: repaymentPlan.agreedDate ?? null,
          }
        : null,
    };
  });

  const totals: DebtTotals = plotRows.reduce(
    (acc, i) => {
      acc.sumMembership += i.debtMembership;
      acc.sumTarget += i.debtTarget;
      acc.sumElectric += i.debtElectric;
      acc.sumTotal += i.debtTotal;
      acc.count += i.debtTotal > 0 ? 1 : 0;
      return acc;
    },
    { count: 0, sumMembership: 0, sumTarget: 0, sumElectric: 0, sumTotal: 0 }
  );

    return ok(request, {
      items: plotRows,
      totals,
      period: selectedPeriod
        ? {
            id: selectedPeriod.id,
            from: selectedPeriod.from,
            to: selectedPeriod.to,
            title: selectedPeriod.title,
            status: selectedPeriod.status,
          }
        : null,
      mode: "plots" as const,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
