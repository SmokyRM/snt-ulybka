import { describe, expect, it } from "vitest";
import type { UnifiedBillingPeriod } from "@/types/snt";
import { assertPeriodEditable } from "@/lib/billing/unifiedPolicy";

describe("billing period policy", () => {
  it("запрещает изменения для закрытого периода", () => {
    const period: UnifiedBillingPeriod = {
      id: "p1",
      from: "2025-01-01",
      to: "2025-01-31",
      status: "closed",
      title: "Январь 2025",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: null,
      updatedByUserId: null,
    };

    expect(() => assertPeriodEditable(period)).toThrow("period_closed");
  });

  it("разрешает изменения для незакрытого периода", () => {
    const period: UnifiedBillingPeriod = {
      id: "p2",
      from: "2025-02-01",
      to: "2025-02-28",
      status: "draft",
      title: "Февраль 2025",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: null,
      updatedByUserId: null,
    };

    expect(() => assertPeriodEditable(period)).not.toThrow();
  });
});
