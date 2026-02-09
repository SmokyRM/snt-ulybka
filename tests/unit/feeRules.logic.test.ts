import { describe, it, expect } from "vitest";
import { getRuleAmount, matchesRulePlot } from "@/lib/billing/feeRules.logic";
import type { BillingFeeRule } from "@/lib/billing/feeRules.pg";

describe("feeRules.logic", () => {
  const baseRule: BillingFeeRule = {
    id: "rule-1",
    name: "Rule",
    periodFrom: null,
    periodTo: null,
    appliesTo: "all",
    selector: {},
    calcType: "flat",
    amount: 100,
    meta: {},
    createdAt: "2024-01-01",
    createdBy: null,
    isActive: true,
  };

  it("matches plot by id selector", () => {
    const rule = { ...baseRule, appliesTo: "plot", selector: { plotIds: ["plot-1"] } };
    expect(
      matchesRulePlot(rule, {
        id: "plot-1",
        plot_number: "1",
        snt_street_number: "1",
        city_address: null,
      }),
    ).toBe(true);
    expect(
      matchesRulePlot(rule, {
        id: "plot-2",
        plot_number: "2",
        snt_street_number: "1",
        city_address: null,
      }),
    ).toBe(false);
  });

  it("matches plot by street selector", () => {
    const rule = { ...baseRule, appliesTo: "street", selector: { streets: ["5"] } };
    expect(
      matchesRulePlot(rule, {
        id: "plot-1",
        plot_number: "1",
        snt_street_number: "5",
        city_address: null,
      }),
    ).toBe(true);
  });

  it("calculates amount per area", () => {
    const rule = {
      ...baseRule,
      calcType: "per_area",
      amount: 10,
      meta: { areaByPlot: { "plot-1": 3 } },
    };
    expect(getRuleAmount(rule, "plot-1")).toBe(30);
  });
});
