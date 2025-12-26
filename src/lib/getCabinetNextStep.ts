export type NextStep = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

type Params = {
  membershipStatus: "member" | "non-member" | "unknown";
  financeStatus: "ok" | "debt" | "unknown";
  membershipDebt: number | null;
  electricityDebt: number | null;
};

export function getCabinetNextStep(params: Params): NextStep {
  const { membershipStatus, financeStatus, membershipDebt, electricityDebt } = params;

  if (membershipStatus === "non-member") {
    return {
      title: "Станьте членом СНТ",
      description: "Членам доступна полная информация по участку, начислениям и обращениям.",
      ctaLabel: "Как вступить",
      ctaHref: "/docs",
    };
  }

  if (financeStatus === "debt") {
    const parts: string[] = [];
    if (typeof membershipDebt === "number" && membershipDebt > 0) {
      parts.push(`Членские: ${membershipDebt} ₽`);
    }
    if (typeof electricityDebt === "number" && electricityDebt > 0) {
      parts.push(`Электроэнергия: ${electricityDebt} ₽`);
    }
    const debts = parts.length ? parts.join(", ") : "Есть задолженность";
    return {
      title: "Есть задолженность",
      description: debts,
      ctaLabel: "Посмотреть детали",
      ctaHref: "/cabinet",
    };
  }

  if (financeStatus === "unknown" || membershipStatus === "unknown") {
    return {
      title: "Данные уточняются",
      description: "Если вы недавно вступили или сменился собственник — обновите данные через обращение.",
      ctaLabel: "Написать обращение",
      ctaHref: "/cabinet",
    };
  }

  return {
    title: "Всё в порядке",
    description: "Проверьте новости и документы СНТ.",
    ctaLabel: "Открыть новости",
    ctaHref: "/#news",
  };
}
