import type { UnifiedBillingPeriod } from "@/types/snt";

export const isPeriodClosed = (period: UnifiedBillingPeriod) => period.status === "closed";

export const assertPeriodEditable = (period: UnifiedBillingPeriod) => {
  if (isPeriodClosed(period)) {
    throw new Error("period_closed");
  }
};
