import {
  findAccrualPeriod,
  listAccrualItems,
  listDebtNotifications,
  listPayments,
  listPlots,
} from "@/lib/mockDb";
import { categoryForAccrualType } from "@/lib/paymentCategory";
import type { Payment } from "@/types/snt";

export type DebtTypeFilter = "all" | "membership" | "target" | "electricity";

const parsePeriod = (value: string | null) => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
};

const sumPayments = (payments: Payment[]) =>
  payments.filter((p) => !p.isVoided).reduce((sum, p) => sum + p.amount, 0);

const normalizeSearch = (value: string) =>
  value.toLowerCase().replace(/[,\s]+/g, " ").trim();

const splitStreetAndNumber = (value: string) => {
  const normalized = normalizeSearch(value);
  if (!normalized) return null;
  const parts = normalized.split(" ").filter(Boolean);
  const numberIndex = parts.findIndex((part, idx) => {
    if (!/^\d+[А-Яа-яA-Za-z-]*$/.test(part)) return false;
    return idx === parts.length - 1 || parts.length > 1;
  });
  if (numberIndex === -1) return null;
  const number = parts[numberIndex];
  const street = parts.slice(0, numberIndex).join(" ").trim();
  if (!street || !number) return null;
  return { street, number };
};

export const getDebtsData = (params: {
  period: string | null;
  type: DebtTypeFilter;
  minDebt?: number | null;
  q?: string | null;
  onlyUnnotified?: boolean;
}) => {
  const parsed = parsePeriod(params.period);
  if (!parsed) {
    return { items: [], totals: { count: 0, sumMembership: 0, sumTarget: 0, sumElectricity: 0, sumTotal: 0 }, error: "Неверный период" };
  }
  const periodIds: Record<"membership" | "target" | "electricity", string | null> = {
    membership: null,
    target: null,
    electricity: null,
  };
  const membershipPeriod = findAccrualPeriod(parsed.year, parsed.month, "membership_fee");
  const targetPeriod = findAccrualPeriod(parsed.year, parsed.month, "target_fee");
  const electricityPeriod = findAccrualPeriod(parsed.year, parsed.month, "electricity");
  periodIds.membership = membershipPeriod?.id ?? null;
  periodIds.target = targetPeriod?.id ?? null;
  periodIds.electricity = electricityPeriod?.id ?? null;

  const plots = listPlots();

  const accrualsByType: Record<"membership" | "target" | "electricity", ReturnType<typeof listAccrualItems>> = {
    membership: membershipPeriod ? listAccrualItems(membershipPeriod.id) : [],
    target: targetPeriod ? listAccrualItems(targetPeriod.id) : [],
    electricity: electricityPeriod ? listAccrualItems(electricityPeriod.id) : [],
  };

  const paymentsByType: Record<"membership" | "target" | "electricity", Payment[]> = {
    membership: membershipPeriod
      ? listPayments({
          periodId: membershipPeriod.id,
          includeVoided: false,
          category: categoryForAccrualType("membership_fee"),
        })
      : [],
    target: targetPeriod
      ? listPayments({
          periodId: targetPeriod.id,
          includeVoided: false,
          category: categoryForAccrualType("target_fee"),
        })
      : [],
    electricity: electricityPeriod
      ? listPayments({
          periodId: electricityPeriod.id,
          includeVoided: false,
          category: categoryForAccrualType("electricity"),
        })
      : [],
  };

  const existingNotifications = {
    membership: membershipPeriod ? listDebtNotifications({ periodId: membershipPeriod.id, type: "membership" }) : [],
    electricity: electricityPeriod ? listDebtNotifications({ periodId: electricityPeriod.id, type: "electricity" }) : [],
    target: targetPeriod ? listDebtNotifications({ periodId: targetPeriod.id, type: "membership" }) : [], // target пока без отдельного типа уведомлений
  };

  const q = params.q?.trim() ?? "";
  const normalizedQuery = normalizeSearch(q);
  const streetNumberQuery = splitStreetAndNumber(q);

  const items = plots.map((plot) => {
    const membershipAcc = accrualsByType.membership.find((a) => a.plotId === plot.id);
    const targetAcc = accrualsByType.target.find((a) => a.plotId === plot.id);
    const elecAcc = accrualsByType.electricity.find((a) => a.plotId === plot.id);

    const membershipPaid = sumPayments(paymentsByType.membership.filter((p) => p.plotId === plot.id));
    const targetPaid = sumPayments(paymentsByType.target.filter((p) => p.plotId === plot.id));
    const elecPaid = sumPayments(paymentsByType.electricity.filter((p) => p.plotId === plot.id));

    const debtMembership = Math.max((membershipAcc?.amountAccrued ?? 0) - membershipPaid, 0);
    const debtTarget = Math.max((targetAcc?.amountAccrued ?? 0) - targetPaid, 0);
    const debtElectricity = Math.max((elecAcc?.amountAccrued ?? 0) - elecPaid, 0);
    const debtTotal = debtMembership + debtTarget + debtElectricity;

    const notif =
      params.type === "electricity"
        ? existingNotifications.electricity.find((n) => n.plotId === plot.id)
        : existingNotifications.membership.find((n) => n.plotId === plot.id);

    return {
      plotId: plot.id,
      plotCardId: plot.id || plot.plotId,
      street: plot.street,
      number: plot.plotNumber,
      ownerName: plot.ownerFullName ?? "—",
      debtMembership,
      debtTarget,
      debtElectricity,
      debtTotal,
      notificationStatus: notif?.status ?? "new",
      periodId:
        params.type === "electricity"
          ? periodIds.electricity
          : params.type === "target"
            ? periodIds.target
            : periodIds.membership,
    };
  });

  const filtered = items.filter((item) => {
    if (params.onlyUnnotified && item.notificationStatus === "resolved") return false;
    if (params.type === "membership" && item.debtMembership <= 0) return false;
    if (params.type === "target" && item.debtTarget <= 0) return false;
    if (params.type === "electricity" && item.debtElectricity <= 0) return false;
    if (params.type === "all" && item.debtTotal <= 0) return false;
    if (params.minDebt && item.debtTotal < params.minDebt) return false;
    if (q) {
      const hay = normalizeSearch(`${item.street} ${item.number} ${item.ownerName}`);
      if (streetNumberQuery) {
        if (!hay.includes(normalizeSearch(streetNumberQuery.street))) return false;
        if (!hay.includes(normalizeSearch(streetNumberQuery.number))) return false;
      } else if (normalizedQuery && !hay.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  });

  const totals = filtered.reduce(
    (acc, item) => {
      acc.count += 1;
      acc.sumMembership += item.debtMembership;
      acc.sumTarget += item.debtTarget;
      acc.sumElectricity += item.debtElectricity;
      acc.sumTotal += item.debtTotal;
      return acc;
    },
    { count: 0, sumMembership: 0, sumTarget: 0, sumElectricity: 0, sumTotal: 0 }
  );

  return { items: filtered, totals, error: null };
};
