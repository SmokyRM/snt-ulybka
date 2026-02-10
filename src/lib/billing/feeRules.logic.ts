import type { BillingFeeRule, FeeRuleCalcType } from "@/lib/billing/feeRules.pg";

export type FeeRulePlot = {
  id: string;
  plot_number: string | null;
  snt_street_number: string | null;
  city_address: string | null;
};

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const getRuleAmount = (rule: BillingFeeRule, plotId: string) => {
  if (rule.calcType === "flat") return rule.amount;
  const meta = rule.meta ?? {};
  if (rule.calcType === "per_area") {
    const areaByPlot = meta.areaByPlot as Record<string, number> | undefined;
    const area = areaByPlot?.[plotId];
    return toNumber(area) * rule.amount;
  }
  if (rule.calcType === "per_kwh") {
    const kwhByPlot = meta.kwhByPlot as Record<string, number> | undefined;
    const kwh = kwhByPlot?.[plotId];
    return toNumber(kwh) * rule.amount;
  }
  return rule.amount;
};

export const matchesRulePlot = (rule: BillingFeeRule, plot: FeeRulePlot) => {
  if (rule.appliesTo === "all") return true;
  if (rule.appliesTo === "plot") {
    const plotIds = (rule.selector?.plotIds as string[] | undefined) ?? [];
    return plotIds.length ? plotIds.includes(plot.id) : true;
  }
  if (rule.appliesTo === "street") {
    const streets = (rule.selector?.streets as string[] | undefined) ?? [];
    if (!streets.length) return true;
    return Boolean(plot.snt_street_number && streets.includes(plot.snt_street_number));
  }
  if (rule.appliesTo === "tag") {
    const tags = (rule.selector?.tags as string[] | undefined) ?? [];
    const plotTags = (rule.selector?.plotTags as Record<string, string[]> | undefined)?.[plot.id] ?? [];
    if (!tags.length) return true;
    return plotTags.some((tag) => tags.includes(tag));
  }
  return true;
};
