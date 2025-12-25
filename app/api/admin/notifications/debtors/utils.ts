import {
  findAccrualPeriod,
  findPlotById,
  listAccrualItems,
  listPayments,
  listPlots,
  listDebtNotifications,
} from "@/lib/mockDb";

type NotificationType = "membership" | "electricity";

const parsePeriod = (value: string | null) => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
};

const buildText = (
  type: NotificationType,
  args: { ownerName: string; street: string; number: string; period: string; debt: number; amountAccrued: number; amountPaid: number }
) => {
  if (type === "membership") {
    return `Уважаемый(ая) ${args.ownerName}, по участку ${args.street}, ${args.number} у вас задолженность по членским взносам за ${args.period} в размере ${args.debt} ₽.`;
  }
  return `Уважаемый(ая) ${args.ownerName}, по участку ${args.street}, ${args.number} у вас задолженность за электроэнергию за ${args.period} в размере ${args.debt} ₽. Начислено: ${args.amountAccrued} ₽, оплачено: ${args.amountPaid} ₽.`;
};

export const getAccrualDebtors = (type: NotificationType, periodRaw: string | null) => {
  const parsedPeriod = parsePeriod(periodRaw);
  if (!parsedPeriod) return { items: [], periodLabel: "", error: "Укажите период в формате YYYY-MM" };
  const periodLabel = `${parsedPeriod.year}-${String(parsedPeriod.month).padStart(2, "0")}`;
  const period = findAccrualPeriod(
    parsedPeriod.year,
    parsedPeriod.month,
    type === "membership" ? "membership_fee" : "electricity"
  );
  if (!period) return { items: [], periodLabel, error: null };

  const accruals = listAccrualItems(period.id);
  const paymentsAll = listPayments({ periodId: period.id, includeVoided: false });

  const existingStatuses = listDebtNotifications({ periodId: period.id, type });

  const items = accruals.map((acc) => {
    const plot = findPlotById(acc.plotId) ?? listPlots().find((p) => p.id === acc.plotId);
    const amountPaid = paymentsAll
      .filter((p) => p.plotId === acc.plotId)
      .reduce((sum, p) => sum + p.amount, 0);
    const debt = acc.amountAccrued - amountPaid;
    const status = existingStatuses.find((n) => n.plotId === acc.plotId);
    return {
      plotId: acc.plotId,
      street: plot?.street ?? "",
      number: plot?.plotNumber ?? "",
      ownerName: plot?.ownerFullName ?? "собственник",
      amountAccrued: acc.amountAccrued,
      amountPaid,
      debt,
      notificationStatus: status?.status ?? "new",
      notificationComment: status?.comment ?? null,
      notificationUpdatedAt: status?.updatedAt ?? null,
      periodId: period.id,
    };
  });

  const debtors = items.filter((i) => i.debt > 0);
  const withText = debtors.map((i) => ({
    ...i,
    text: buildText(type, {
      ownerName: i.ownerName,
      street: i.street,
      number: i.number,
      period: periodLabel,
      debt: Number(i.debt.toFixed(2)),
      amountAccrued: Number(i.amountAccrued.toFixed(2)),
      amountPaid: Number(i.amountPaid.toFixed(2)),
    }),
  }));

  return { items: withText, periodLabel, error: null };
};
