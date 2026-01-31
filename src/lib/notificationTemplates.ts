/**
 * Notification Templates System
 * Sprint 19: Templates for notification drafts with placeholder support
 */

export type NotificationTemplateId = "debt_notice" | "penalty_added" | "receipt_ready" | "appeal_updated";

export interface NotificationTemplate {
  id: NotificationTemplateId;
  name: string;
  description: string;
  subject: string;
  body: string;
  placeholders: string[];
}

// Available placeholders: {name} {plot} {period} {debt} {penalty} {payLink} {receiptLink}
const templates: Record<NotificationTemplateId, NotificationTemplate> = {
  debt_notice: {
    id: "debt_notice",
    name: "Уведомление о задолженности",
    description: "Стандартное уведомление о наличии задолженности",
    subject: "Уведомление о задолженности",
    body: `Уважаемый(ая) {name},

Сообщаем Вам о наличии задолженности по взносам в СНТ.

Участок: {plot}
Период: {period}
Сумма задолженности: {debt} руб.

Просим Вас погасить задолженность в ближайшее время.

Реквизиты для оплаты: {payLink}

С уважением,
Правление СНТ`,
    placeholders: ["name", "plot", "period", "debt", "payLink"],
  },
  penalty_added: {
    id: "penalty_added",
    name: "Начисление пени",
    description: "Уведомление о начислении пени за просрочку",
    subject: "Начислена пеня за просрочку",
    body: `Уважаемый(ая) {name},

Сообщаем Вам о начислении пени за просрочку оплаты взносов.

Участок: {plot}
Период: {period}
Основной долг: {debt} руб.
Начислено пени: {penalty} руб.

Просим погасить задолженность во избежание дальнейшего начисления пени.

Реквизиты для оплаты: {payLink}

С уважением,
Правление СНТ`,
    placeholders: ["name", "plot", "period", "debt", "penalty", "payLink"],
  },
  receipt_ready: {
    id: "receipt_ready",
    name: "Квитанция готова",
    description: "Уведомление о готовности квитанции на оплату",
    subject: "Квитанция на оплату готова",
    body: `Уважаемый(ая) {name},

Квитанция на оплату за {period} готова.

Участок: {plot}
Сумма к оплате: {debt} руб.

Скачать квитанцию: {receiptLink}

С уважением,
Правление СНТ`,
    placeholders: ["name", "plot", "period", "debt", "receiptLink"],
  },
  appeal_updated: {
    id: "appeal_updated",
    name: "Обновление по обращению",
    description: "Уведомление об изменении статуса обращения",
    subject: "Статус вашего обращения изменён",
    body: `Уважаемый(ая) {name},

По Вашему обращению есть обновление.

Участок: {plot}

Пожалуйста, проверьте статус в личном кабинете.

С уважением,
Правление СНТ`,
    placeholders: ["name", "plot"],
  },
};

/**
 * Get template by ID
 */
export function getNotificationTemplate(id: NotificationTemplateId): NotificationTemplate | null {
  return templates[id] ?? null;
}

/**
 * List all available templates
 */
export function listNotificationTemplates(): NotificationTemplate[] {
  return Object.values(templates);
}

/**
 * Render template with placeholder values
 */
export function renderTemplate(
  templateId: NotificationTemplateId,
  values: Record<string, string | number>
): { subject: string; body: string } | null {
  const template = getNotificationTemplate(templateId);
  if (!template) return null;

  let subject = template.subject;
  let body = template.body;

  Object.entries(values).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    const strValue = String(value);
    subject = subject.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), strValue);
    body = body.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), strValue);
  });

  return { subject, body };
}

/**
 * Render custom text with placeholder values
 */
export function renderText(text: string, values: Record<string, string | number>): string {
  let result = text;
  Object.entries(values).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), String(value));
  });
  return result;
}

/**
 * Get default placeholder values for a draft
 */
export function getDefaultPlaceholderValues(draft: {
  residentName: string;
  plotLabel: string;
  debtAmount: number;
  period?: string;
  penalty?: number;
}): Record<string, string | number> {
  const payLink = process.env.NEXT_PUBLIC_PAY_LINK || "https://snt.example.com/pay";
  const receiptLink = process.env.NEXT_PUBLIC_RECEIPT_LINK || "https://snt.example.com/receipts";

  return {
    name: draft.residentName,
    plot: draft.plotLabel,
    period: draft.period || new Date().toISOString().slice(0, 7),
    debt: draft.debtAmount,
    penalty: draft.penalty ?? 0,
    payLink,
    receiptLink,
  };
}
