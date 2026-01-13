import { randomUUID } from "crypto";

export type Charge = { id: string; date: string; plotId: string; residentId: string; title: string; amount: number };
export type Payment = {
  id: string;
  date: string;
  plotId: string;
  residentId: string;
  amount: number;
  method: "cash" | "card" | "bank";
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
  { id: "p1", date: "2024-03-02", plotId: "p1", residentId: "user-resident-default", amount: 3000, method: "bank" },
  { id: "p2", date: "2024-03-06", plotId: "p2", residentId: "user-r2", amount: 4100, method: "card" },
  { id: "p3", date: "2024-03-08", plotId: "p3", residentId: "user-r3", amount: 5000, method: "bank" },
  { id: "p4", date: "2024-03-09", plotId: "p4", residentId: "user-r4", amount: 2000, method: "cash" },
  { id: "p5", date: "2024-03-10", plotId: "p5", residentId: "user-r5", amount: 3800, method: "bank" },
  { id: "p6", date: "2024-03-11", plotId: "p6", residentId: "user-r6", amount: 2000, method: "card" },
  { id: "p7", date: "2024-03-11", plotId: "p1", residentId: "user-resident-default", amount: 1500, method: "bank" },
  { id: "p8", date: "2024-03-12", plotId: "p7", residentId: "user-r7", amount: 1500, method: "cash" },
];

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

export function addCharge(input: { plotId: string; residentId: string; title: string; amount: number }) {
  charges.push({ id: randomUUID(), date: new Date().toISOString(), ...input });
}

export function addPayment(input: {
  plotId: string;
  residentId: string;
  amount: number;
  method: "cash" | "card" | "bank";
}) {
  payments.push({ id: randomUUID(), date: new Date().toISOString(), ...input });
}
