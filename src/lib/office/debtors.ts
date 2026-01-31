import { listDebts, listAccrualsWithStatus } from "@/lib/billing.store";
import { findRegistryByPlotNumber } from "@/lib/registry.store";
import { findUserById } from "@/lib/mockDb";

export type DebtorSegment = "S0" | "S1" | "S2" | "S3" | "S4";

export type DebtorRow = {
  plotLabel: string;
  plotId: string;
  residentId: string;
  residentName: string;
  totalDebt: number;
  overdueDays: number;
  segment: DebtorSegment;
  amountBucket: string;
  hasPhone: boolean;
  hasTelegram: boolean;
};

const amountThresholds = [0, 5000, 15000, 30000];

const resolveBucket = (amount: number) => {
  if (amount <= amountThresholds[1]) return "A1";
  if (amount <= amountThresholds[2]) return "A2";
  if (amount <= amountThresholds[3]) return "A3";
  return "A4";
};

const resolveSegment = (days: number, debt: number): DebtorSegment => {
  if (debt <= 0) return "S0";
  if (days <= 30) return "S1";
  if (days <= 90) return "S2";
  if (days <= 180) return "S3";
  return "S4";
};

export function listDebtorSegments() {
  const debts = listDebts();
  const accruals = listAccrualsWithStatus().filter((a) => (a.remaining ?? 0) > 0);
  const now = Date.now();

  const overdueByResident: Record<string, number> = {};
  accruals.forEach((accrual) => {
    const days = Math.max(0, Math.floor((now - new Date(accrual.date).getTime()) / 86400000));
    overdueByResident[accrual.residentId] = Math.max(overdueByResident[accrual.residentId] ?? 0, days);
  });

  return debts.map((row) => {
    const overdueDays = overdueByResident[row.residentId] ?? 0;
    const segment = resolveSegment(overdueDays, row.debt);
    const registryItem = findRegistryByPlotNumber(row.plotId);
    const user = findUserById(row.residentId);
    return {
      plotLabel: row.plotId,
      plotId: row.plotId,
      residentId: row.residentId,
      residentName: row.residentName,
      totalDebt: row.debt,
      overdueDays,
      segment,
      amountBucket: resolveBucket(row.debt),
      hasPhone: Boolean(registryItem?.phone),
      hasTelegram: Boolean(user?.telegramChatId),
    } as DebtorRow;
  });
}
