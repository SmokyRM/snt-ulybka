import { randomUUID } from "crypto";

export type Charge = {
  id: string;
  date: string;
  plotId: string;
  residentId: string;
  title: string;
  amount: number;
  period?: string;
  category?: "membership" | "electricity" | "target";
};
export type PaymentStatus = "unmatched" | "needs_review" | "matched";
export type PaymentMatchStatus = "matched" | "ambiguous" | "unmatched";
export type PaymentAllocationStatus = "unallocated" | "partially_allocated" | "allocated" | "overpaid";
export type AccrualStatus = "open" | "partially_paid" | "paid";

export type Payment = {
  id: string;
  date: string;
  plotId: string;
  residentId: string;
  amount: number;
  method: "cash" | "card" | "bank";
  payer?: string;
  purpose?: string;
  bankRef?: string;
  direction?: "in" | "out";
  status?: PaymentStatus;
  matchStatus?: PaymentMatchStatus;
  matchCandidates?: string[] | null;
  matchedPlotId?: string | null;
  matchConfidence?: number | null;
  matchReason?: string | null;
  autoAllocateDisabled?: boolean;
  allocatedAmount?: number;
  remainingAmount?: number;
  allocationStatus?: PaymentAllocationStatus;
};

export type Allocation = {
  id: string;
  paymentId: string;
  accrualId: string;
  amount: number;
  createdAt: string;
};
export type DebtRow = {
  key: string;
  plotId: string;
  residentId: string;
  residentName: string;
  chargedTotal: number;
  paidTotal: number;
  debt: number;
};

type PlotCredit = {
  plotId: string;
  amount: number;
};

const charges: Charge[] = [
  { id: "c1", date: "2024-03-01", plotId: "p1", residentId: "user-resident-default", title: "Членский взнос", amount: 5200 },
  { id: "c2", date: "2024-03-05", plotId: "p2", residentId: "user-r2", title: "Членский взнос", amount: 4100 },
  { id: "c3", date: "2024-03-07", plotId: "p3", residentId: "user-r3", title: "Электроэнергия", amount: 3500 },
  { id: "c4", date: "2024-03-08", plotId: "p4", residentId: "user-r4", title: "Членский взнос", amount: 6000 },
  { id: "c5", date: "2024-03-09", plotId: "p5", residentId: "user-r5", title: "Членский взнос", amount: 3800 },
  { id: "c6", date: "2024-03-10", plotId: "p6", residentId: "user-r6", title: "Электроэнергия", amount: 4500 },
  { id: "c7", date: "2024-03-10", plotId: "p1", residentId: "user-resident-default", title: "Электроэнергия", amount: 2000 },
  { id: "c8", date: "2024-03-11", plotId: "p2", residentId: "user-r2", title: "Электроэнергия", amount: 1800 },
  { id: "c9", date: "2024-03-12", plotId: "p3", residentId: "user-r3", title: "Целевой взнос", amount: 3000 },
  { id: "c10", date: "2024-03-12", plotId: "p7", residentId: "user-r7", title: "Членский взнос", amount: 3200 },
];

const payments: Payment[] = [
  { id: "p1", date: "2024-03-02", plotId: "p1", residentId: "user-resident-default", amount: 3000, method: "bank", payer: "Анна Петрова", status: "matched", matchedPlotId: "p1", matchConfidence: 0.9, matchReason: "plot_exact" },
  { id: "p2", date: "2024-03-06", plotId: "p2", residentId: "user-r2", amount: 4100, method: "card", payer: "Сергей К.", status: "matched", matchedPlotId: "p2", matchConfidence: 0.9, matchReason: "plot_exact" },
  { id: "p3", date: "2024-03-08", plotId: "p3", residentId: "user-r3", amount: 5000, method: "bank", payer: "Марина Л.", status: "matched", matchedPlotId: "p3", matchConfidence: 0.9, matchReason: "plot_exact" },
  { id: "p4", date: "2024-03-09", plotId: "p4", residentId: "user-r4", amount: 2000, method: "cash", payer: "Иван Н.", status: "matched", matchedPlotId: "p4", matchConfidence: 0.9, matchReason: "plot_exact" },
  { id: "p5", date: "2024-03-10", plotId: "p5", residentId: "user-r5", amount: 3800, method: "bank", payer: "Ольга Р.", status: "matched", matchedPlotId: "p5", matchConfidence: 0.9, matchReason: "plot_exact" },
  { id: "p6", date: "2024-03-11", plotId: "p6", residentId: "user-r6", amount: 2000, method: "card", payer: "Алексей Т.", status: "matched", matchedPlotId: "p6", matchConfidence: 0.9, matchReason: "plot_exact" },
  { id: "p7", date: "2024-03-11", plotId: "p1", residentId: "user-resident-default", amount: 1500, method: "bank", payer: "Анна Петрова", status: "matched", matchedPlotId: "p1", matchConfidence: 0.9, matchReason: "plot_exact" },
  { id: "p8", date: "2024-03-12", plotId: "p7", residentId: "user-r7", amount: 1500, method: "cash", payer: "Екатерина М.", status: "matched", matchedPlotId: "p7", matchConfidence: 0.9, matchReason: "plot_exact" },
  { id: "p9", date: "2024-03-15", plotId: "unknown", residentId: "unknown", amount: 2700, method: "bank", payer: "Марина Л.", status: "unmatched", matchedPlotId: null, matchConfidence: null, matchReason: "needs_review" },
  { id: "p10", date: "2024-03-18", plotId: "unknown", residentId: "unknown", amount: 5200, method: "bank", payer: "Сергей К.", status: "needs_review", matchedPlotId: null, matchConfidence: 0.4, matchReason: "payer_only" },
];

const allocations: Allocation[] = [];

const residentNames: Record<string, string> = {
  "user-resident-default": "Анна Петрова",
  "user-r2": "Сергей К.",
  "user-r3": "Марина Л.",
  "user-r4": "Иван Н.",
  "user-r5": "Ольга Р.",
  "user-r6": "Алексей Т.",
  "user-r7": "Екатерина М.",
};

const plotIds: Record<string, string> = {
  p1: "Берёзовая, 12",
  p2: "Луговая, 7",
  p3: "Сиреневая, 3",
  p4: "Лесная, 21",
  p5: "Речная, 5",
  p6: "Солнечная, 14",
  p7: "Ромашковая, 11",
};

const membershipFees: { period: string; amount: number }[] = [
  { period: "2024-03", amount: 4500 },
  { period: "2024-04", amount: 4600 },
];

const electricityTariffs: { period: string; amount: number }[] = [
  { period: "2024-03", amount: 6.2 },
  { period: "2024-04", amount: 6.5 },
];

const plotDiscounts: { plotId: string; percent: number }[] = [
  { plotId: "p2", percent: 10 },
];

const DEFAULT_CATEGORY_PRIORITY: Charge["category"][] = ["membership", "target", "electricity"];

export function getPlotLabel(plotId: string) {
  return plotIds[plotId] ?? plotId;
}

export function listPlotEntries() {
  return Object.entries(plotIds).map(([plotId, label]) => ({ plotId, label }));
}

export function getMembershipFee(period: string) {
  return membershipFees.find((rule) => rule.period === period)?.amount ?? null;
}

export function getElectricityTariff(period: string) {
  return electricityTariffs.find((rule) => rule.period === period)?.amount ?? null;
}

export function getDiscountPercent(plotId: string) {
  return plotDiscounts.find((d) => d.plotId === plotId)?.percent ?? 0;
}

export function getOfficeSummary() {
  const rows = listDebts();
  const totalDebt = rows.reduce((sum, r) => (r.debt > 0 ? sum + r.debt : sum), 0);
  const debtorsCount = rows.filter((r) => r.debt > 0).length;
  const collected30d = payments
    .filter((p) => new Date(p.date).getTime() >= Date.now() - 30 * 86400000)
    .reduce((sum, p) => sum + p.amount, 0);
  return { totalDebt, debtorsCount, collected30d };
}

export function listDebts(params: { q?: string | null } = {}): DebtRow[] {
  const q = params.q?.trim().toLowerCase();
  const byResident: Record<string, DebtRow> = {};
  charges.forEach((c) => {
    const key = c.residentId;
    if (!byResident[key]) {
      byResident[key] = {
        key,
        plotId: plotIds[c.plotId] ?? c.plotId,
        residentId: c.residentId,
        residentName: residentNames[c.residentId] ?? "—",
        chargedTotal: 0,
        paidTotal: 0,
        debt: 0,
      };
    }
    byResident[key].chargedTotal += c.amount;
  });
  payments.forEach((p) => {
    const key = p.residentId;
    if (!byResident[key]) {
      byResident[key] = {
        key,
        plotId: plotIds[p.plotId] ?? p.plotId,
        residentId: p.residentId,
        residentName: residentNames[p.residentId] ?? "—",
        chargedTotal: 0,
        paidTotal: 0,
        debt: 0,
      };
    }
    byResident[key].paidTotal += p.amount;
  });
  let rows = Object.values(byResident).map((r) => ({
    ...r,
    debt: r.chargedTotal - r.paidTotal,
  }));

  if (q) {
    rows = rows.filter((r) => `${r.plotId} ${r.residentName}`.toLowerCase().includes(q));
  }
  return rows.sort((a, b) => b.debt - a.debt);
}

export function listCharges() {
  return charges.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function listPayments() {
  return payments.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getChargeById(id: string) {
  return charges.find((c) => c.id === id) ?? null;
}

export function getPaymentById(id: string) {
  return payments.find((p) => p.id === id) ?? null;
}

export function listAllocations() {
  return allocations.slice();
}

export function listAllocationsByPayment(paymentId: string) {
  return allocations.filter((allocation) => allocation.paymentId === paymentId);
}

export function listAllocationsByAccrual(accrualId: string) {
  return allocations.filter((allocation) => allocation.accrualId === accrualId);
}

export function getAllocationById(id: string) {
  return allocations.find((allocation) => allocation.id === id) ?? null;
}

const getPaymentPlotId = (payment: Payment) => payment.matchedPlotId ?? payment.plotId;

const getMatchStatus = (payment: Payment): PaymentMatchStatus => {
  if (payment.matchStatus) return payment.matchStatus;
  if (payment.matchedPlotId) return "matched";
  if ((payment.matchCandidates ?? []).length > 0) return "ambiguous";
  return "unmatched";
};

const getAccrualPeriod = (accrual: Charge) => (accrual.period ?? accrual.date.slice(0, 7));

const getCategoryPriority = (category: Charge["category"]) => {
  if (!category) return DEFAULT_CATEGORY_PRIORITY.length + 1;
  const idx = DEFAULT_CATEGORY_PRIORITY.indexOf(category);
  return idx === -1 ? DEFAULT_CATEGORY_PRIORITY.length + 1 : idx;
};

const sortAccrualsByPriority = (items: Charge[]) => {
  return items.sort((a, b) => {
    const periodA = getAccrualPeriod(a);
    const periodB = getAccrualPeriod(b);
    if (periodA !== periodB) {
      return periodA.localeCompare(periodB);
    }
    const catA = getCategoryPriority(a.category);
    const catB = getCategoryPriority(b.category);
    if (catA !== catB) return catA - catB;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
};

function recomputeAccrual(accrualId: string) {
  const accrual = charges.find((c) => c.id === accrualId);
  if (!accrual) return null;
  const paidAmount = listAllocationsByAccrual(accrualId).reduce((sum, a) => sum + a.amount, 0);
  const remainingAmount = Math.max(0, accrual.amount - paidAmount);
  const status: AccrualStatus = paidAmount <= 0 ? "open" : remainingAmount > 0 ? "partially_paid" : "paid";
  const updated = {
    ...accrual,
    paidAmount,
    remainingAmount,
    status,
  } as Charge & { paidAmount: number; remainingAmount: number; status: AccrualStatus };
  const idx = charges.findIndex((c) => c.id === accrualId);
  charges[idx] = updated;
  return updated;
}

function hasOpenAccruals(plotId: string) {
  return charges.some((c) => c.plotId === plotId && (getAccrualPaymentSummary(c.id)?.remainingAmount ?? c.amount) > 0);
}

function recomputePayment(paymentId: string) {
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  const allocatedAmount = listAllocationsByPayment(paymentId).reduce((sum, a) => sum + a.amount, 0);
  const remainingAmount = Math.max(0, payment.amount - allocatedAmount);
  const plotId = getPaymentPlotId(payment);
  const shouldOverpay = remainingAmount > 0 && plotId && plotId !== "unknown" && !hasOpenAccruals(plotId);
  const allocationStatus: PaymentAllocationStatus =
    allocatedAmount <= 0
      ? "unallocated"
      : remainingAmount > 0
        ? shouldOverpay
          ? "overpaid"
          : "partially_allocated"
        : "allocated";
  const updated = {
    ...payment,
    allocatedAmount,
    remainingAmount,
    allocationStatus,
  } as Payment;
  const idx = payments.findIndex((p) => p.id === paymentId);
  payments[idx] = updated;
  return updated;
}

export function createAllocation(input: { paymentId: string; accrualId: string; amount: number }) {
  const allocation: Allocation = {
    id: randomUUID(),
    paymentId: input.paymentId,
    accrualId: input.accrualId,
    amount: input.amount,
    createdAt: new Date().toISOString(),
  };
  allocations.push(allocation);
  recomputePayment(input.paymentId);
  recomputeAccrual(input.accrualId);
  return allocation;
}

export function removeAllocation(allocationId: string) {
  const idx = allocations.findIndex((a) => a.id === allocationId);
  if (idx === -1) return false;
  const [removed] = allocations.splice(idx, 1);
  if (removed) {
    recomputePayment(removed.paymentId);
    recomputeAccrual(removed.accrualId);
  }
  return true;
}

export function removeAllocationsByPayment(paymentId: string) {
  const toRemove = allocations.filter((a) => a.paymentId === paymentId);
  if (toRemove.length === 0) return 0;
  for (const allocation of toRemove) {
    removeAllocation(allocation.id);
  }
  return toRemove.length;
}

export function listPaymentsFiltered(params: {
  status?: PaymentStatus | null;
  matchStatus?: PaymentMatchStatus | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
} = {}) {
  let rows = listPayments();
  if (params.status) {
    rows = rows.filter((p) => (p.status ?? "unmatched") === params.status);
  }
  if (params.matchStatus) {
    rows = rows.filter((p) => getMatchStatus(p) === params.matchStatus);
  }
  if (params.q) {
    const q = params.q.trim().toLowerCase();
    rows = rows.filter((p) =>
      `${p.payer ?? ""} ${plotIds[p.plotId] ?? p.plotId}`.toLowerCase().includes(q),
    );
  }
  if (params.from) {
    const fromTs = new Date(params.from).getTime();
    rows = rows.filter((p) => new Date(p.date).getTime() >= fromTs);
  }
  if (params.to) {
    const toTs = new Date(params.to).getTime();
    rows = rows.filter((p) => new Date(p.date).getTime() <= toTs);
  }
  return rows;
}

export function resolvePlotIdByLabel(label: string | null | undefined) {
  if (!label) return null;
  const normalized = label.trim().toLowerCase();
  const match = Object.entries(plotIds).find(([key, value]) => {
    return key.toLowerCase() === normalized || value.toLowerCase() === normalized;
  });
  return match ? match[0] : null;
}

export function resolvePlotIdByPayer(payer: string | null | undefined) {
  if (!payer) return null;
  const normalized = payer.trim().toLowerCase();
  const residentEntry = Object.entries(residentNames).find(([, name]) => name.toLowerCase() === normalized);
  if (!residentEntry) return null;
  const residentId = residentEntry[0];
  const charge = charges.find((c) => c.residentId === residentId);
  return charge?.plotId ?? null;
}

export function updatePayment(id: string, updates: Partial<Omit<Payment, "id">>) {
  const index = payments.findIndex((p) => p.id === id);
  if (index === -1) return null;
  payments[index] = { ...payments[index], ...updates };
  return payments[index];
}

export function getPaymentAllocationSummary(paymentId: string) {
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  const allocatedAmount = listAllocationsByPayment(paymentId).reduce((sum, a) => sum + a.amount, 0);
  const remainingAmount = Math.max(0, payment.amount - allocatedAmount);
  const plotId = getPaymentPlotId(payment);
  const shouldOverpay = remainingAmount > 0 && plotId && plotId !== "unknown" && !hasOpenAccruals(plotId);
  const status: PaymentAllocationStatus =
    allocatedAmount <= 0
      ? "unallocated"
      : remainingAmount > 0
        ? shouldOverpay
          ? "overpaid"
          : "partially_allocated"
        : "allocated";
  return { allocatedAmount, remainingAmount, remaining: remainingAmount, status };
}

export function getAccrualPaymentSummary(accrualId: string) {
  const accrual = charges.find((c) => c.id === accrualId);
  if (!accrual) return null;
  const paidAmount = listAllocationsByAccrual(accrualId).reduce((sum, a) => sum + a.amount, 0);
  const remainingAmount = Math.max(0, accrual.amount - paidAmount);
  const status: AccrualStatus =
    paidAmount <= 0 ? "open" : remainingAmount > 0 ? "partially_paid" : "paid";
  return { paidAmount, remainingAmount, remaining: remainingAmount, status };
}

export function listAccrualsWithStatus() {
  return listCharges().map((accrual) => {
    const summary = getAccrualPaymentSummary(accrual.id);
    const remainingAmount = summary?.remainingAmount ?? accrual.amount;
    return {
      ...accrual,
      paidAmount: summary?.paidAmount ?? 0,
      remainingAmount,
      remaining: remainingAmount,
      status: summary?.status ?? "open",
    };
  });
}

export function previewAccruals(params: {
  period: string;
  category: "membership" | "electricity" | "target";
  tariff?: number | null;
  fixedAmount?: number | null;
  plotIds?: string[] | null;
  plotQuery?: string | null;
}) {
  let plots = listPlotEntries();
  if (params.plotQuery) {
    const query = params.plotQuery.trim().toLowerCase();
    plots = plots.filter((plot) => `${plot.label} ${plot.plotId}`.toLowerCase().includes(query));
  }
  if (params.plotIds && params.plotIds.length > 0) {
    const set = new Set(params.plotIds);
    plots = plots.filter((plot) => set.has(plot.plotId));
  }
  const rows = plots.map((plot) => {
    const discount = getDiscountPercent(plot.plotId);
    let amount = 0;
    if (params.fixedAmount !== null && params.fixedAmount !== undefined) {
      amount = params.fixedAmount;
    } else if (params.category === "membership") {
      amount = params.tariff ?? getMembershipFee(params.period) ?? 0;
    } else if (params.category === "electricity") {
      const tariff = params.tariff ?? getElectricityTariff(params.period) ?? 0;
      amount = tariff * 100;
    } else {
      amount = params.tariff ?? 0;
    }
    if (discount > 0) {
      amount = Math.round(amount * (1 - discount / 100));
    }
    return {
      plotId: plot.plotId,
      plotLabel: plot.label,
      amount,
      discount,
    };
  });
  return rows;
}

export function generateAccruals(params: {
  period: string;
  category: "membership" | "electricity" | "target";
  tariff?: number | null;
  fixedAmount?: number | null;
  plotIds?: string[] | null;
  plotQuery?: string | null;
}) {
  const rows = previewAccruals(params);
  let createdCount = 0;
  const duplicates: string[] = [];

  rows.forEach((row) => {
    const duplicate = charges.find(
      (c) => c.period === params.period && c.category === params.category && c.plotId === row.plotId,
    );
    if (duplicate) {
      duplicates.push(row.plotId);
      return;
    }
    addCharge({
      plotId: row.plotId,
      residentId: "unknown",
      title: params.category === "membership" ? "Членский взнос" : params.category === "electricity" ? "Электроэнергия" : "Целевой взнос",
      amount: row.amount,
      period: params.period,
      category: params.category,
      date: `${params.period}-01`,
    });
    createdCount += 1;
  });

  return { createdCount, skippedCount: duplicates.length, duplicates };
}

export function listPaymentsWithStatus(filters?: Parameters<typeof listPaymentsFiltered>[0]) {
  return listPaymentsFiltered(filters).map((payment) => {
    const summary = getPaymentAllocationSummary(payment.id);
    const remainingAmount = summary?.remainingAmount ?? payment.amount;
    return {
      ...payment,
      matchStatus: getMatchStatus(payment),
      allocatedAmount: summary?.allocatedAmount ?? 0,
      remainingAmount,
      remaining: remainingAmount,
      allocationStatus: summary?.status ?? "unallocated",
    };
  });
}

export function autoAllocatePayment(paymentId: string) {
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  if (payment.autoAllocateDisabled) return payment;
  const summary = getPaymentAllocationSummary(paymentId);
  if (!summary || summary.remainingAmount <= 0) return payment;
  const plotId = getPaymentPlotId(payment);
  if (!plotId || plotId === "unknown") return payment;

  const openAccruals = sortAccrualsByPriority(
    charges.filter((c) => c.plotId === plotId && (getAccrualPaymentSummary(c.id)?.remainingAmount ?? c.amount) > 0),
  );

  let remaining = summary.remainingAmount;
  openAccruals.forEach((accrual) => {
    if (remaining <= 0) return;
    const accrualSummary = getAccrualPaymentSummary(accrual.id);
    const accrualRemaining = accrualSummary ? accrualSummary.remainingAmount : accrual.amount;
    if (accrualRemaining <= 0) return;
    const applied = Math.min(remaining, accrualRemaining);
    createAllocation({ paymentId: payment.id, accrualId: accrual.id, amount: applied });
    remaining -= applied;
  });

  recomputePayment(paymentId);
  return payments.find((p) => p.id === paymentId) ?? payment;
}

export function autoAllocatePayments(params?: {
  limit?: number;
  from?: string | null;
  to?: string | null;
  paymentIds?: string[];
}) {
  let paymentsToAllocate = payments.filter((p) => {
    const plotId = getPaymentPlotId(p);
    return (
      !p.autoAllocateDisabled &&
      plotId &&
      plotId !== "unknown" &&
      (getPaymentAllocationSummary(p.id)?.remainingAmount ?? 0) > 0
    );
  });
  if (params?.from) {
    const fromTs = new Date(params.from).getTime();
    paymentsToAllocate = paymentsToAllocate.filter((p) => new Date(p.date).getTime() >= fromTs);
  }
  if (params?.to) {
    const toTs = new Date(params.to).getTime();
    paymentsToAllocate = paymentsToAllocate.filter((p) => new Date(p.date).getTime() <= toTs);
  }
  if (params?.paymentIds && params.paymentIds.length > 0) {
    const set = new Set(params.paymentIds);
    paymentsToAllocate = paymentsToAllocate.filter((p) => set.has(p.id));
  }
  if (typeof params?.limit === "number") {
    paymentsToAllocate = paymentsToAllocate.slice(0, params.limit);
  }
  paymentsToAllocate.forEach((p) => autoAllocatePayment(p.id));
  return { total: paymentsToAllocate.length };
}

export function listPlotCredits(): PlotCredit[] {
  const credits = new Map<string, number>();
  listPaymentsWithStatus().forEach((payment) => {
    if (payment.allocationStatus !== "overpaid") return;
    const plotId = getPaymentPlotId(payment);
    if (!plotId || plotId === "unknown") return;
    const remaining = payment.remainingAmount ?? 0;
    if (remaining <= 0) return;
    credits.set(plotId, (credits.get(plotId) ?? 0) + remaining);
  });
  return Array.from(credits.entries()).map(([plotId, amount]) => ({ plotId, amount }));
}

export function applyCreditFromPayments(paymentIds: string[]) {
  if (paymentIds.length === 0) return { applied: 0 };
  const selected = payments.filter((p) => paymentIds.includes(p.id));
  const grouped = new Map<string, Payment[]>();
  selected.forEach((payment) => {
    const plotId = getPaymentPlotId(payment);
    if (!plotId || plotId === "unknown") return;
    if (!grouped.has(plotId)) grouped.set(plotId, []);
    grouped.get(plotId)!.push(payment);
  });

  let applied = 0;
  grouped.forEach((plotPayments, plotId) => {
    const openAccruals = sortAccrualsByPriority(
      charges.filter((c) => c.plotId === plotId && (getAccrualPaymentSummary(c.id)?.remainingAmount ?? c.amount) > 0),
    );
    if (openAccruals.length === 0) return;
    const orderedPayments = plotPayments
      .map((p) => recomputePayment(p.id) ?? p)
      .filter((p) => (p.remainingAmount ?? 0) > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const payment of orderedPayments) {
      let remaining = payment.remainingAmount ?? 0;
      if (remaining <= 0) continue;
      for (const accrual of openAccruals) {
        if (remaining <= 0) break;
        const accrualSummary = getAccrualPaymentSummary(accrual.id);
        const accrualRemaining = accrualSummary ? accrualSummary.remainingAmount : accrual.amount;
        if (accrualRemaining <= 0) continue;
        const appliedAmount = Math.min(remaining, accrualRemaining);
        createAllocation({ paymentId: payment.id, accrualId: accrual.id, amount: appliedAmount });
        applied += appliedAmount;
        remaining -= appliedAmount;
      }
    }
  });
  return { applied };
}

export function getResidentBalance(residentId: string) {
  const residentCharges = charges.filter((c) => c.residentId === residentId);
  const residentPayments = payments.filter((p) => p.residentId === residentId);
  const chargedTotal = residentCharges.reduce((sum, c) => sum + c.amount, 0);
  const paidTotal = residentPayments.reduce((sum, p) => sum + p.amount, 0);
  const debt = chargedTotal - paidTotal;
  const recent = [
    ...residentCharges.map((c) => ({ type: "charge" as const, date: c.date, title: c.title, amount: c.amount })),
    ...residentPayments.map((p) => ({ type: "payment" as const, date: p.date, title: "Оплата", amount: p.amount })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { chargedTotal, paidTotal, debt, recent };
}

export function listPlotBalances() {
  const debtByPlot = new Map<string, number>();
  listAccrualsWithStatus().forEach((accrual) => {
    const remaining = (accrual as { remainingAmount?: number }).remainingAmount ?? accrual.amount;
    if (remaining <= 0) return;
    debtByPlot.set(accrual.plotId, (debtByPlot.get(accrual.plotId) ?? 0) + remaining);
  });
  const credits = listPlotCredits();
  const creditMap = new Map(credits.map((c) => [c.plotId, c.amount]));
  const plotIdsSet = new Set([...debtByPlot.keys(), ...creditMap.keys()]);
  return Array.from(plotIdsSet).map((plotId) => {
    const debt = debtByPlot.get(plotId) ?? 0;
    const credit = creditMap.get(plotId) ?? 0;
    return {
      plotId,
      plotLabel: getPlotLabel(plotId),
      debt,
      credit,
      balance: credit - debt,
    };
  });
}

export function addCharge(input: {
  plotId: string;
  residentId: string;
  title: string;
  amount: number;
  date?: string;
  period?: string;
  category?: Charge["category"];
}) {
  charges.push({
    id: randomUUID(),
    date: input.date ?? new Date().toISOString(),
    ...input,
  });
}

export function addPayment(input: {
  plotId: string;
  residentId: string;
  amount: number;
  method: "cash" | "card" | "bank";
  date?: string;
  payer?: string;
  purpose?: string;
  bankRef?: string;
  direction?: "in" | "out";
  status?: PaymentStatus;
  matchStatus?: PaymentMatchStatus;
  matchCandidates?: string[] | null;
  matchedPlotId?: string | null;
  matchConfidence?: number | null;
  matchReason?: string | null;
}) {
  payments.push({
    id: randomUUID(),
    date: input.date ?? new Date().toISOString(),
    status: "unmatched",
    matchStatus: "unmatched",
    matchCandidates: null,
    matchedPlotId: null,
    matchConfidence: null,
    matchReason: null,
    ...input,
  });
}
