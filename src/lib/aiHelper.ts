import { cabinetSectionHref } from "@/lib/cabinetRoutes";

export type AIQuestionType =
  | "debt_reason"
  | "membership_requirements"
  | "fee_calculation"
  | "what_to_confirm"
  | "plot_pending"
  | "plot_rejected"
  | "plot_need_confirmation";

export type AIContext = {
  membershipStatus: "member" | "non-member" | "pending" | "unknown";
  plotsCount: number;
  hasVerifiedPlot: boolean;
  verificationsSent: number;
  verificationsRejected: number;
  membershipDebt: number | null;
  electricityDebt: number | null;
};

export type AIResponse = {
  text: string;
  severity?: "info" | "warning" | "danger";
  actions?: Array<{ label: string; href: string }>;
  bullets?: string[];
};

export const getRecommendedQuestions = (context: AIContext): AIQuestionType[] => {
  const recommended: AIQuestionType[] = [];
  const hasDebt = (context.membershipDebt ?? 0) > 0 || (context.electricityDebt ?? 0) > 0;
  if (context.verificationsSent > 0) recommended.push("plot_pending");
  if (context.verificationsRejected > 0) recommended.push("plot_rejected");
  if (context.plotsCount === 0) recommended.push("plot_need_confirmation");
  if (hasDebt) recommended.push("debt_reason");
  if (context.membershipStatus !== "member") recommended.push("membership_requirements");
  if (!context.hasVerifiedPlot) recommended.push("what_to_confirm");
  if (!recommended.includes("fee_calculation")) recommended.push("fee_calculation");
  return recommended;
};

export function generateAIResponse(context: AIContext, question: AIQuestionType): AIResponse {
  switch (question) {
    case "debt_reason": {
      const membershipDebt = context.membershipDebt ?? 0;
      const electricityDebt = context.electricityDebt ?? 0;
      if (membershipDebt <= 0 && electricityDebt <= 0) {
        return {
          text: "По данным кабинета задолженность сейчас не отображается. Если вы ожидали долг, уточните данные через обращение.",
          severity: "info",
        };
      }
      const parts: string[] = [];
      if (membershipDebt > 0) parts.push(`Членские взносы: ${membershipDebt} ₽`);
      if (electricityDebt > 0) parts.push(`Электроэнергия: ${electricityDebt} ₽`);
      return {
        text: "Долг возникает, когда начисления превышают оплату за период.",
        severity: "warning",
        bullets: parts,
        actions: [
          { label: "Перейти к оплате", href: cabinetSectionHref("finance") },
          { label: "Посмотреть начисления", href: cabinetSectionHref("charges") },
        ],
      };
    }
    case "membership_requirements": {
      if (context.membershipStatus === "member") {
        return {
          text: "Ваш статус подтверждён правлением. Доступ к разделам кабинета открыт.",
          severity: "info",
        };
      }
      if (context.membershipStatus === "pending") {
        return {
          text: "Правление рассматривает заявку. После подтверждения откроется полный доступ.",
          severity: "warning",
        };
      }
      return {
        text: "Заполните профиль и подайте заявку на подтверждение членства в кабинете.",
        bullets: ["Проверьте данные профиля", "Подайте заявку", "Дождитесь подтверждения"],
        severity: "info",
      };
    }
    case "fee_calculation": {
      return {
        text: "Начисления формируются по правилам СНТ и решениям собраний. Итоговые суммы отображаются в разделе «Финансы».",
        bullets: ["Членские и целевые взносы", "Периоды начислений", "Статус оплат"],
        severity: "info",
      };
    }
    case "what_to_confirm": {
      if (context.hasVerifiedPlot) {
        return {
          text: "Участок уже подтверждён, дополнительных действий не требуется.",
          severity: "info",
        };
      }
      const plotHint =
        context.plotsCount > 0
          ? "Уточните данные участка и дождитесь подтверждения правления."
          : "Добавьте участок в кабинете и отправьте его на проверку.";
      return {
        text: plotHint,
        severity: "warning",
        actions: [
          { label: "Мои участки", href: cabinetSectionHref("plots") },
          ...(context.membershipStatus !== "member"
            ? [{ label: "Подтвердить членство", href: cabinetSectionHref("home") }]
            : []),
        ],
      };
    }
    case "plot_pending": {
      return {
        text: "Статус «На проверке» означает, что правление проверяет заявку. Обычно это занимает 1–3 рабочих дня.",
        severity: "info",
      };
    }
    case "plot_rejected": {
      return {
        text: "Заявку отклонили из-за отсутствия данных или несоответствия. Проверьте причину в карточке участка и отправьте новую.",
        severity: "warning",
        actions: [{ label: "Мои участки", href: cabinetSectionHref("plots") }],
      };
    }
    case "plot_need_confirmation": {
      return {
        text: "Подтверждение участка открывает доступ к начислениям и другим данным. Добавьте участок и отправьте заявку.",
        severity: "warning",
        actions: [{ label: "Подтвердить участок", href: cabinetSectionHref("plots") }],
      };
    }
    default:
      return { text: "Выберите вопрос, чтобы получить подсказку.", severity: "info" };
  }
}
