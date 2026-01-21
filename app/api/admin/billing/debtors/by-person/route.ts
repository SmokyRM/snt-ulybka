import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import {
  getDb,
  listUnifiedBillingPeriods,
  listPeriodAccruals,
  listPlots,
  listPayments,
} from "@/lib/mockDb";
import type { PeriodAccrual } from "@/types/snt";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";

export type DebtorByPerson = {
  personKey: string;
  fullName: string;
  plotCount: number;
  debtTotal: number;
  overdueDays: number;
  phone?: string | null;
  email?: string | null;
};

const statusOk = (s: string | undefined) => ["draft", "locked", "approved", "closed"].includes(s ?? "");

function daysFromTo(toDate: string): number {
  const to = new Date(toDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - to.getTime()) / 86400000));
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("periodId") || null;

    const allPeriods = listUnifiedBillingPeriods();
    const periods = periodId
      ? allPeriods.filter((p) => p.id === periodId)
      : allPeriods.filter((p) => statusOk(p.status));

    if (periods.length === 0) {
      return ok(request, { items: [] as DebtorByPerson[], period: null });
    }

  const plots = listPlots() ?? [];
  const db = getDb();
  const plotOwners = db.plotOwners ?? [];
  const persons = db.persons ?? [];

  type Agg = {
    fullName: string;
    phone: string | null;
    email: string | null;
    plotIds: Set<string>;
    debtTotal: number;
    minPeriodTo: string | null;
  };
  const agg = new Map<string, Agg>();

  function getOrCreate(
    key: string,
    fullName: string,
    phone: string | null,
    email: string | null
  ): Agg {
    let v = agg.get(key);
    if (!v) {
      v = { fullName, phone, email, plotIds: new Set(), debtTotal: 0, minPeriodTo: null };
      agg.set(key, v);
    }
    return v;
  }

  for (const selectedPeriod of periods) {
    const accruals = listPeriodAccruals(selectedPeriod.id) ?? [];
    const allPayments = listPayments({}) ?? [];

    const accrualsByPlot: Record<
      string,
      { membership: PeriodAccrual[]; target: PeriodAccrual[]; electric: PeriodAccrual[] }
    > = {};
    accruals.forEach((acc) => {
      if (!acc?.plotId) return;
      if (!accrualsByPlot[acc.plotId])
        accrualsByPlot[acc.plotId] = { membership: [], target: [], electric: [] };
      if (acc.type === "membership") accrualsByPlot[acc.plotId].membership.push(acc);
      else if (acc.type === "target") accrualsByPlot[acc.plotId].target.push(acc);
      else if (acc.type === "electric") accrualsByPlot[acc.plotId].electric.push(acc);
    });

    const paymentsByPlot: Record<string, { membership: number; target: number; electric: number }> = {};
    accruals.forEach((acc) => {
      if (!acc?.plotId) return;
      if (!paymentsByPlot[acc.plotId]) paymentsByPlot[acc.plotId] = { membership: 0, target: 0, electric: 0 };
      if (acc.type === "membership") paymentsByPlot[acc.plotId].membership += acc.amountPaid ?? 0;
      else if (acc.type === "target") paymentsByPlot[acc.plotId].target += acc.amountPaid ?? 0;
      else if (acc.type === "electric") paymentsByPlot[acc.plotId].electric += acc.amountPaid ?? 0;
    });

    allPayments
      .filter((p) => p.plotId && p.periodId === selectedPeriod.id)
      .forEach((p) => {
        const pid = p.plotId!;
        if (!paymentsByPlot[pid]) paymentsByPlot[pid] = { membership: 0, target: 0, electric: 0 };
        if (p.category === "membership" || p.category === "membership_fee")
          paymentsByPlot[pid].membership += p.amount;
        else if (p.category === "target" || p.category === "target_fee") paymentsByPlot[pid].target += p.amount;
        else if (p.category === "electricity" || p.category === "electric")
          paymentsByPlot[pid].electric += p.amount;
      });

    const periodTo = selectedPeriod.to ?? "";

    for (const plot of plots) {
      const pac = accrualsByPlot[plot.id] || { membership: [], target: [], electric: [] };
      const pp = paymentsByPlot[plot.id] || { membership: 0, target: 0, electric: 0 };
      const dm = Math.max(
        (pac.membership || []).reduce((s, a) => s + (a.amountAccrued ?? 0), 0) - (pp.membership ?? 0),
        0
      );
      const dt = Math.max(
        (pac.target || []).reduce((s, a) => s + (a.amountAccrued ?? 0), 0) - (pp.target ?? 0),
        0
      );
      const de = Math.max(
        (pac.electric || []).reduce((s, a) => s + (a.amountAccrued ?? 0), 0) - (pp.electric ?? 0),
        0
      );
      const debtTotal = dm + dt + de;
      if (debtTotal <= 0) continue;

      const po = plotOwners.find((o) => o.plotNumber === plot.plotNumber);
      const person = po?.userIdentifier ? persons.find((p) => p.id === po.userIdentifier) : null;

      let key: string;
      let fullName: string;
      let phone: string | null;
      let email: string | null;
      if (person) {
        key = person.id;
        fullName = person.fullName ?? plot.ownerFullName ?? "—";
        phone = person.phone ?? plot.phone ?? null;
        email = person.email ?? plot.email ?? null;
      } else {
        key = `fallback:${(plot.ownerFullName ?? "").trim()}|${(plot.phone ?? "").replace(/\D/g, "")}`;
        fullName = plot.ownerFullName ?? "—";
        phone = plot.phone ?? null;
        email = plot.email ?? null;
      }

      const v = getOrCreate(key, fullName, phone, email);
      v.plotIds.add(plot.id);
      v.debtTotal += debtTotal;
      if (periodTo && (!v.minPeriodTo || periodTo < v.minPeriodTo)) {
        v.minPeriodTo = periodTo;
      }
    }
  }

  const items: DebtorByPerson[] = Array.from(agg.entries()).map(([personKey, v]) => ({
    personKey,
    fullName: v.fullName,
    plotCount: v.plotIds.size,
    debtTotal: v.debtTotal,
    overdueDays: v.minPeriodTo ? daysFromTo(v.minPeriodTo) : 0,
    phone: v.phone || null,
    email: v.email || null,
  }));

    items.sort((a, b) => b.debtTotal - a.debtTotal);

    const selectedPeriod = periods.sort((a, b) => b.from.localeCompare(a.from))[0] ?? null;
    return ok(request, {
      items,
      period: selectedPeriod
        ? {
            id: selectedPeriod.id,
            from: selectedPeriod.from,
            to: selectedPeriod.to,
            title: selectedPeriod.title,
          }
        : null,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
