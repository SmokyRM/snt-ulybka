/**
 * Payment QR Code Generator
 * Sprint 31: Generate payment QR data in Russian bank standard format (ГОСТ Р 56042-2014)
 *
 * Format: ST00012|Name=...|PersonalAcc=...|BankName=...|BIC=...|CorrespAcc=...|Purpose=...
 */

import { type Requisites } from "./requisites.store";

export type PaymentQRData = {
  requisites: Requisites;
  amount: number;
  purpose: string;
  payerName?: string;
};

/**
 * Generate payment string in ГОСТ Р 56042-2014 format
 * This format is used by Russian banks for QR code payments
 */
export function generatePaymentQRString(data: PaymentQRData): string {
  const { requisites, amount, purpose, payerName } = data;

  // Format amount: kopecks as integer, no decimals
  const amountKopecks = Math.round(amount * 100);
  const amountStr = amountKopecks > 0 ? String(amountKopecks) : "";

  // Build the payment string according to ГОСТ Р 56042-2014
  // ST00012 = service tag + format version
  const parts: string[] = [
    "ST00012",
    `Name=${requisites.recipientName}`,
    `PersonalAcc=${requisites.account}`,
    `BankName=${requisites.bankName}`,
    `BIC=${requisites.bik}`,
    `CorrespAcc=${requisites.corrAccount}`,
  ];

  // Add PayeeINN (recipient INN)
  if (requisites.inn) {
    parts.push(`PayeeINN=${requisites.inn}`);
  }

  // Add KPP if available
  if (requisites.kpp) {
    parts.push(`KPP=${requisites.kpp}`);
  }

  // Add amount if specified
  if (amountStr) {
    parts.push(`Sum=${amountStr}`);
  }

  // Add purpose (required)
  parts.push(`Purpose=${encodePaymentField(purpose)}`);

  // Add payer name if specified
  if (payerName) {
    parts.push(`PayerName=${encodePaymentField(payerName)}`);
  }

  return parts.join("|");
}

/**
 * Encode special characters for payment field
 * The standard uses | as delimiter, so we need to escape it
 */
function encodePaymentField(value: string): string {
  return value
    .replace(/\|/g, " ")  // Replace pipes with spaces
    .replace(/\n/g, " ")  // Replace newlines with spaces
    .trim();
}

/**
 * Generate a data URL for QR code image (SVG format)
 * Uses a simple QR code generation approach for deterministic output
 *
 * Note: For production use, consider using a dedicated QR library.
 * This generates a placeholder that can be replaced with actual QR rendering.
 */
export function generatePaymentQRDataUrl(data: PaymentQRData): string {
  const paymentString = generatePaymentQRString(data);

  // Generate a deterministic SVG placeholder with encoded data
  // The actual QR rendering should be done client-side with a proper library
  // This returns the data in a format that can be used by client-side QR generators
  const base64Data = Buffer.from(paymentString, "utf-8").toString("base64");

  // Return data URL with payment string for client-side QR generation
  return `data:text/plain;base64,${base64Data}`;
}

/**
 * Get the raw payment string for QR code generation
 * Client-side components should use this to generate actual QR codes
 */
export function getPaymentQRContent(data: PaymentQRData): string {
  return generatePaymentQRString(data);
}

/**
 * Validate QR data before generation
 */
export function validatePaymentQRData(data: PaymentQRData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.requisites) {
    errors.push("Requisites are required");
  } else {
    if (!data.requisites.account) {
      errors.push("Account number is required");
    }
    if (!data.requisites.bik) {
      errors.push("BIK is required");
    }
    if (!data.requisites.recipientName) {
      errors.push("Recipient name is required");
    }
  }

  if (!data.purpose) {
    errors.push("Payment purpose is required");
  }

  if (data.amount < 0) {
    errors.push("Amount cannot be negative");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format amount for display in Russian rubles
 */
export function formatAmountRub(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(amount);
}
