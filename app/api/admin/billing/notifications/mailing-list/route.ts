import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { getMessageTemplate } from "@/lib/billing";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";
import {
  getDb,
  listUnifiedBillingPeriods,
  listPeriodAccruals,
  listPlots,
  listPayments,
} from "@/lib/mockDb";
import type { PeriodAccrual } from "@/types/snt";

type MailingRow = { fullName: string; phone: string; debtTotal: number; text: string };

const statusOk = (s: string | undefined) => ["draft", "locked", "approved", "closed"].includes(s ?? "");

function substitute(msg: string, vars: Record<string, string>): string {
  let s = msg;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    s = s.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return s;
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user)) return forbidden(request);

    const body = await request.json().catch(() => ({}));
    const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
    const periodId = typeof body.periodId === "string" ? body.periodId.trim() : null;

    if (!templateId) return badRequest(request, "templateId required");

    const template = getMessageTemplate(templateId);
    if (!template) return fail(request, "not_found", "template not found", 404);

  const allPeriods = listUnifiedBillingPeriods();
  const periods = periodId
    ? allPeriods.filter((p) => p.id === periodId)
    : allPeriods.filter((p) => statusOk(p.status));

  if (periods.length === 0) return ok(request, { rows: [] as MailingRow[], period: null });

  const period = periods.sort((a, b) => b.from.localeCompare(a.from))[0];
  if (!period) return ok(request, { rows: [], period: null });

  const accruals = listPeriodAccruals(period.id) ?? [];
  const plots = listPlots() ?? [];
  const allPayments = listPayments({}) ?? [];
  const db = getDb();
  const plotOwners = db.plotOwners ?? [];
  const persons = db.persons ?? [];

  const accrualsByPlot: Record<string, { membership: PeriodAccrual[]; target: PeriodAccrual[]; electric: PeriodAccrual[] }> = {};
  accruals.forEach((acc) => {
    if (!acc?.plotId) return;
    if (!accrualsByPlot[acc.plotId]) accrualsByPlot[acc.plotId] = { membership: [], target: [], electric: [] };
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
    .filter((p) => p.plotId && p.periodId === period.id)
    .forEach((p) => {
      const pid = p.plotId!;
      if (!paymentsByPlot[pid]) paymentsByPlot[pid] = { membership: 0, target: 0, electric: 0 };
      if (p.category === "membership" || p.category === "membership_fee") paymentsByPlot[pid].membership += p.amount;
      else if (p.category === "target" || p.category === "target_fee") paymentsByPlot[pid].target += p.amount;
      else if (p.category === "electricity" || p.category === "electric") paymentsByPlot[pid].electric += p.amount;
    });

  const agg = new Map<string, { fullName: string; phone: string; email: string | null; debtTotal: number }>();

  for (const plot of plots) {
    const pac = accrualsByPlot[plot.id] || { membership: [], target: [], electric: [] };
    const pp = paymentsByPlot[plot.id] || { membership: 0, target: 0, electric: 0 };
    const dm = Math.max((pac.membership || []).reduce((s, a) => s + (a.amountAccrued ?? 0), 0) - (pp.membership ?? 0), 0);
    const dt = Math.max((pac.target || []).reduce((s, a) => s + (a.amountAccrued ?? 0), 0) - (pp.target ?? 0), 0);
    const de = Math.max((pac.electric || []).reduce((s, a) => s + (a.amountAccrued ?? 0), 0) - (pp.electric ?? 0), 0);
    const debtTotal = dm + dt + de;
    if (debtTotal <= 0) continue;

    const po = plotOwners.find((o) => o.plotNumber === plot.plotNumber);
    const person = po?.userIdentifier ? persons.find((p) => p.id === po.userIdentifier) : null;
    const fullName = person?.fullName ?? plot.ownerFullName ?? "—";
    const phone = (person?.phone ?? plot.phone ?? "").trim() || "—";
    const email = person?.email ?? plot.email ?? null;

    const key = person ? person.id : `f:${(plot.ownerFullName ?? "").trim()}|${(plot.phone ?? "").replace(/\D/g, "")}`;
    const cur = agg.get(key);
    if (cur) {
      cur.debtTotal += debtTotal;
    } else {
      agg.set(key, { fullName, phone, email, debtTotal });
    }
  }

  const periodFrom = period.from ?? "";
  const periodTo = period.to ?? "";
  const periodsStr = `${periodFrom} — ${periodTo}`;
  const fmt = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const rows: MailingRow[] = Array.from(agg.values()).map((v) => {
    const text = substitute(template.message, {
      ownerName: v.fullName,
      debtAmount: fmt(v.debtTotal),
      debtTotal: fmt(v.debtTotal),
      periodFrom,
      periodTo,
      periods: periodsStr,
      plotNumber: "—",
      street: "—",
    });
    return { fullName: v.fullName, phone: v.phone, debtTotal: v.debtTotal, text };
  });

    rows.sort((a, b) => b.debtTotal - a.debtTotal);

    return ok(request, {
      rows,
      period: { id: period.id, from: periodFrom, to: periodTo, title: period.title },
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
