import {
  resetMockDb,
  getMockDbSnapshot,
  getPlots,
  upsertRegistryPlot,
  updatePlotStatus,
  createAccrualPeriod,
  listAccrualItems,
  updateAccrualItem,
  addPayment,
  upsertUserById,
  listPayments,
} from "@/lib/mockDb";
import { categoryForAccrualType } from "@/lib/paymentCategory";
import { saveMockDbToFile } from "@/lib/mockDbFile";

export type SeedSummary = {
  plotCount: number;
  memberCount: number;
  periodKey: string;
  totalAccrued: number;
  totalPaid: number;
  totalDebt: number;
  debtorsCount: number;
};

const seedUsers = () => {
  upsertUserById({
    id: "seed_owner_1",
    fullName: "Анна Смирнова",
    phone: "+7 900 111-11-11",
    role: "user",
    status: "verified",
  });
  upsertUserById({
    id: "seed_owner_2",
    fullName: "Иван Петров",
    phone: "+7 900 222-22-22",
    role: "user",
    status: "verified",
  });
};

const seedPlots = () => {
  const streets = ["Центральная", "Лесная", "Березовая"];
  for (let i = 1; i <= 30; i += 1) {
    const street = streets[(i - 1) % streets.length];
    const plotDisplay = `Улица ${street}, участок ${i}`;
    const cadastral = `74:00:0000000:${(1200 + i).toString().padStart(4, "0")}`;
    const seedOwnerName = i <= 4 ? (i <= 2 ? "Анна Смирнова" : "Иван Петров") : null;
    const seedOwnerPhone = i <= 4 ? (i <= 2 ? "+7 900 111-11-11" : "+7 900 222-22-22") : null;
    upsertRegistryPlot({
      plotDisplay,
      cadastral,
      seedOwnerName,
      seedOwnerPhone,
      note: i % 5 === 0 ? "Требует уточнения" : null,
    });
  }

  const plots = getPlots();
  const memberIds = plots.slice(0, 10).map((p) => p.id);
  const nonMemberIds = plots.slice(10, 20).map((p) => p.id);
  plots.forEach((plot) => {
    const membershipStatus = memberIds.includes(plot.id)
      ? "MEMBER"
      : nonMemberIds.includes(plot.id)
        ? "NON_MEMBER"
        : "UNKNOWN";
    updatePlotStatus(plot.id, {
      membershipStatus,
      isConfirmed: membershipStatus === "MEMBER",
    });
  });

  return { memberIds, plotsCount: plots.length };
};

const seedBilling = (memberIds: string[]) => {
  const period = createAccrualPeriod({ year: 2025, month: 1, type: "membership_fee", title: null });
  const items = listAccrualItems(period.id);
  items.forEach((item) => {
    const amount = memberIds.includes(item.plotId) ? 5000 : 0;
    updateAccrualItem(item.id, { amountAccrued: amount });
  });

  const category = categoryForAccrualType("membership_fee");
  const fullPaid = memberIds.slice(0, 3);
  const partialPaid = memberIds.slice(3, 5);

  fullPaid.forEach((plotId, idx) => {
    addPayment({
      periodId: period.id,
      plotId,
      amount: 5000,
      category,
      method: "bank",
      paidAt: `2025-01-${String(10 + idx).padStart(2, "0")}T12:00:00.000Z`,
      comment: "Полная оплата",
      createdByUserId: "seed",
    });
  });

  partialPaid.forEach((plotId, idx) => {
    addPayment({
      periodId: period.id,
      plotId,
      amount: 1250,
      category,
      method: "bank",
      paidAt: `2025-01-${String(20 + idx).padStart(2, "0")}T12:00:00.000Z`,
      comment: "Частичная оплата",
      createdByUserId: "seed",
    });
  });

  return period.id;
};

export const seedTestData = async (): Promise<SeedSummary> => {
  resetMockDb();
  seedUsers();
  const { memberIds, plotsCount } = seedPlots();
  const periodId = seedBilling(memberIds);

  const accrualItems = listAccrualItems(periodId);
  const totalAccrued = accrualItems.reduce((sum, item) => sum + item.amountAccrued, 0);

  const payments = listPayments({ periodId, includeVoided: false });
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paymentsByPlot = payments.reduce<Record<string, number>>((acc, payment) => {
    acc[payment.plotId] = (acc[payment.plotId] ?? 0) + payment.amount;
    return acc;
  }, {});

  const debtorsCount = accrualItems.filter((item) => {
    const paid = paymentsByPlot[item.plotId] ?? 0;
    return item.amountAccrued - paid > 0;
  }).length;

  const totalDebt = totalAccrued - totalPaid;
  const snapshot = getMockDbSnapshot();
  if (snapshot) {
    await saveMockDbToFile(snapshot);
  }

  return {
    plotCount: plotsCount,
    memberCount: memberIds.length,
    periodKey: "2025-01",
    totalAccrued,
    totalPaid,
    totalDebt,
    debtorsCount,
  };
};
