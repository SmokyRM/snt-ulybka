import { resolvePlotIdByLabel, resolvePlotIdByPayer, updatePayment, listPayments } from "@/lib/billing.store";
import type { Payment } from "@/lib/billing.store";

export function autoMatchPayment(payment: Payment) {
  if (payment.matchedPlotId && payment.status === "matched") {
    return payment;
  }

  let matchedPlotId = payment.plotId && payment.plotId !== "unknown" ? payment.plotId : null;
  let matchReason: string | null = null;
  let confidence: number | null = null;

  if (matchedPlotId) {
    matchReason = "plot_exact";
    confidence = 0.9;
  } else if (payment.plotId && payment.plotId !== "unknown") {
    const resolved = resolvePlotIdByLabel(payment.plotId);
    if (resolved) {
      matchedPlotId = resolved;
      matchReason = "plot_exact";
      confidence = 0.8;
    }
  }

  if (!matchedPlotId && payment.payer) {
    const byPayer = resolvePlotIdByPayer(payment.payer);
    if (byPayer) {
      matchedPlotId = byPayer;
      matchReason = "payer_only";
      confidence = 0.5;
    }
  }

  const status = matchedPlotId ? "matched" : "needs_review";

  return updatePayment(payment.id, {
    matchedPlotId,
    status,
    matchReason: matchReason ?? "needs_review",
    matchConfidence: confidence,
  });
}

export function runAutoMatch(limit?: number) {
  const payments = listPayments();
  const target = typeof limit === "number" ? payments.slice(0, limit) : payments;
  let matched = 0;
  let needsReview = 0;

  target.forEach((payment) => {
    const updated = autoMatchPayment(payment);
    if (!updated) return;
    if (updated.status === "matched") matched += 1;
    if (updated.status === "needs_review") needsReview += 1;
  });

  return { total: target.length, matched, needsReview };
}
