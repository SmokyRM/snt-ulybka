import { PAYMENT_DETAILS } from "@/config/paymentDetails";

export const DEFAULT_SNT_SETTINGS = {
  electricityTariffRubPerKwh: 6.5,
  electricityPaymentDeadlineDay: 25,
  membershipFeeRubPerYear: 100,
  targetFeeRubPerYear: 0,
  feesPaymentDeadlineDay: 5,
  bankRequisitesText: [
    `Получатель: ${PAYMENT_DETAILS.receiver}`,
    `ИНН/КПП: ${PAYMENT_DETAILS.inn} / ${PAYMENT_DETAILS.kpp}`,
    `Р/с: ${PAYMENT_DETAILS.account}`,
    `Банк: ${PAYMENT_DETAILS.bank}`,
    `ИНН банка: ${PAYMENT_DETAILS.bankInn}`,
    `БИК: ${PAYMENT_DETAILS.bic}`,
    `Корр. счёт: ${PAYMENT_DETAILS.corr}`,
  ].join("\n"),
} as const;
