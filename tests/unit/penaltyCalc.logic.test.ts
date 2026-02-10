import { describe, it, expect } from "vitest";
import { normalizePenaltyRate } from "@/lib/billing/penaltyCalc.logic";

describe("penaltyCalc.logic", () => {
  it("normalizes percent_per_year", () => {
    expect(normalizePenaltyRate(10, "percent_per_year")).toBeCloseTo(0.1);
    expect(normalizePenaltyRate(0.15, "percent_per_year")).toBeCloseTo(0.15);
  });

  it("normalizes percent_per_day to per-year equivalent", () => {
    expect(normalizePenaltyRate(0.001, "percent_per_day")).toBeCloseTo(0.365);
  });

  it("keeps fixed rate as-is", () => {
    expect(normalizePenaltyRate(500, "fixed")).toBe(500);
  });
});
