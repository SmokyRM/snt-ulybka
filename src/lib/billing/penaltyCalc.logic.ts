export const normalizePenaltyRate = (rate: number, rateType: string) => {
  if (rateType === "percent_per_day") {
    const normalized = rate > 1 ? rate / 100 : rate;
    return normalized * 365;
  }
  if (rateType === "percent_per_year") {
    return rate > 1 ? rate / 100 : rate;
  }
  return rate;
};
