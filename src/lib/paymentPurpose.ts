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
