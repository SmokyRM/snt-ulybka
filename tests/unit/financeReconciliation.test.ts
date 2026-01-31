import { describe, expect, it } from "vitest";
import {
  resetMockDb,
  createUnifiedBillingPeriod,
  ensurePeriodAccrual,
  updatePeriodAccrual,
  listPlots,
  addPayment,
} from "@/lib/mockDb";
import { buildPeriodReconciliation } from "@/lib/billing/unifiedReconciliation.server";

describe("finance reconciliation", () => {
  it("повторный импорт не меняет сверку", () => {
    resetMockDb();
    const period = createUnifiedBillingPeriod({
      from: "2025-01-01",
      to: "2025-01-31",
      status: "approved",
      title: "Январь 2025",
      createdByUserId: null,
    });

    const plotId = listPlots()[0].id;
    const accrual = ensurePeriodAccrual(period.id, plotId, "membership");
    updatePeriodAccrual(accrual.id, { amountAccrued: 1000 });

    addPayment({
      periodId: period.id,
      plotId,
      amount: 400,
      paidAt: "2025-01-10T12:00:00.000Z",
      method: "import",
      reference: "row-1",
      comment: null,
      createdByUserId: "user-admin-root",
      fingerprint: "dup-1",
      category: "membership_fee",
    });

    const first = buildPeriodReconciliation(period).totals.paid;

    addPayment({
      periodId: period.id,
      plotId,
      amount: 400,
      paidAt: "2025-01-10T12:00:00.000Z",
      method: "import",
      reference: "row-1",
      comment: null,
      createdByUserId: "user-admin-root",
      fingerprint: "dup-1",
      category: "membership_fee",
    });

    const second = buildPeriodReconciliation(period).totals.paid;
    expect(second).toBe(first);
  });
});
