const normalizePurpose = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ё/g, "е")
    .trim();

export const buildPaymentFingerprint = (data: {
  plotId?: string | null;
  category?: string | null;
  paidAtIso?: string | null;
  amount?: number | null;
  purpose?: string | null;
  reference?: string | null;
}) => {
  const { plotId, category, paidAtIso, amount, purpose, reference } = data;
  if (reference) {
    return `ref:${reference.trim().toLowerCase()}`;
  }
  if (!plotId || !paidAtIso || !amount || amount <= 0) return null;
  const day = paidAtIso.split("T")[0];
  const amountKey = amount.toFixed(2);
  const purposeKey = normalizePurpose(purpose);
  const categoryKey = (category ?? "").toLowerCase();
  return [`plot:${plotId}`, `cat:${categoryKey}`, `day:${day}`, `amt:${amountKey}`, `p:${purposeKey}`].join("|");
};

export const normalizePaymentFingerprint = (payment: {
  plotId: string;
  category?: string | null;
  paidAt: string;
  amount: number;
  fingerprint?: string | null;
  reference?: string | null;
  comment?: string | null;
}) =>
  payment.fingerprint ??
  buildPaymentFingerprint({
    plotId: payment.plotId,
    category: payment.category ?? null,
    paidAtIso: payment.paidAt,
    amount: payment.amount,
    purpose: payment.comment ?? payment.reference ?? "",
    reference: payment.reference ?? null,
  });
