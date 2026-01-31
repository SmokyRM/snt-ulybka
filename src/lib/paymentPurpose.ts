/**
 * Payment Purpose Generator
 * Sprint 31: Enhanced with template-based generation from requisites
 */

import { getLatestRequisites, type Requisites } from "./requisites.store";

// --- Legacy types/functions (existing) ---

export type PaymentPurposeInput = {
  street: string | null;
  plotNumber: string | null;
  paymentType: "electricity" | "membership" | "target";
  kwh?: number | null;
  readingNow?: number | null;
};

export function buildPaymentPurpose(input: PaymentPurposeInput): string {
  const street = input.street || "";
  const plot = input.plotNumber || "";
  const baseLocation = street || plot ? `ул. ${street || "—"}, уч. ${plot || "—"}` : "участок: данные уточняются";

  if (input.paymentType === "electricity") {
    const parts = [`Электроэнергия: ${baseLocation}`];
    if (input.kwh != null) parts.push(`кВт: ${input.kwh}`);
    if (input.readingNow != null) parts.push(`Показания: ${input.readingNow}`);
    return parts.join(", ");
  }

  if (input.paymentType === "target") {
    return `Целевой взнос: ${baseLocation}`;
  }

  return `Членские взносы: ${baseLocation}`;
}

// --- Sprint 31: Template-based purpose generation ---

export type PaymentPurposeParams = {
  plot: string;
  name: string;
  period: string; // YYYY-MM format
  category?: string;
};

/**
 * Format period from YYYY-MM to readable Russian format
 */
function formatPeriod(period: string): string {
  const months = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  const [year, month] = period.split("-");
  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    return period;
  }
  return `${months[monthIndex]} ${year}`;
}

/**
 * Generate payment purpose text from template
 * Template variables: {plot}, {name}, {period}, {category}
 */
export function generatePaymentPurpose(
  params: PaymentPurposeParams,
  template?: string
): string {
  const requisites = getLatestRequisites();
  const purposeTemplate =
    template ?? requisites?.purposeTemplate ?? "Оплата за участок {plot}, {period}. {name}";

  const formattedPeriod = formatPeriod(params.period);

  let purpose = purposeTemplate
    .replace(/\{plot\}/g, params.plot)
    .replace(/\{name\}/g, params.name)
    .replace(/\{period\}/g, formattedPeriod);

  if (params.category) {
    purpose = purpose.replace(/\{category\}/g, params.category);
  } else {
    // Remove category placeholder and any surrounding text if no category provided
    purpose = purpose.replace(/,?\s*\{category\}/g, "");
  }

  // Clean up any double spaces or trailing punctuation issues
  purpose = purpose.replace(/\s+/g, " ").trim();

  return purpose;
}

/**
 * Generate payment purpose with requisites info for QR code
 */
export function generatePaymentPurposeForQR(
  params: PaymentPurposeParams,
  requisites?: Requisites | null
): string {
  const req = requisites ?? getLatestRequisites();
  if (!req) {
    return generatePaymentPurpose(params);
  }
  return generatePaymentPurpose(params, req.purposeTemplate);
}

/**
 * Get full payment details for display
 */
export type PaymentDetailsForDisplay = {
  recipientName: string;
  inn: string;
  kpp: string;
  bankName: string;
  bik: string;
  account: string;
  corrAccount: string;
  purpose: string;
};

export function getPaymentDetailsForDisplay(
  params: PaymentPurposeParams
): PaymentDetailsForDisplay | null {
  const requisites = getLatestRequisites();
  if (!requisites) {
    return null;
  }

  return {
    recipientName: requisites.recipientName,
    inn: requisites.inn,
    kpp: requisites.kpp,
    bankName: requisites.bankName,
    bik: requisites.bik,
    account: requisites.account,
    corrAccount: requisites.corrAccount,
    purpose: generatePaymentPurpose(params, requisites.purposeTemplate),
  };
}
