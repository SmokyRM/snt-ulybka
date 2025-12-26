import { listExpenses, listPayments, listTargetFunds, findTargetFundById } from "@/lib/mockDb";
import type { TargetFund } from "@/types/snt";

const calculateAggregates = (fund: TargetFund) => {
  const collected = listPayments({ includeVoided: false })
    .filter((p) => p.targetFundId === fund.id)
    .reduce((sum, p) => sum + p.amount, 0);
  const spent = listExpenses({}).filter((e) => e.targetFundId === fund.id).reduce((sum, e) => sum + e.amount, 0);
  const remaining = Math.max(fund.targetAmount - collected, 0);
  const progressPct = fund.targetAmount > 0 ? Math.floor((collected / fund.targetAmount) * 100) : 0;
  return { collected, spent, remaining, progressPct };
};

export const listTargetFundsWithStats = (activeOnly = false) => {
  const funds = listTargetFunds();
  const filtered = activeOnly ? funds.filter((f) => f.status === "active") : funds;
  return filtered.map((f) => ({
    ...f,
    ...calculateAggregates(f),
  }));
};

export const getTargetFundWithStats = (id: string) => {
  const fund = findTargetFundById(id);
  if (!fund) return null;
  return { ...fund, ...calculateAggregates(fund) };
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const matchTargetFundByPurpose = (purpose?: string | null): TargetFund | null => {
  if (!purpose) return null;
  const norm = normalize(purpose);
  if (!norm) return null;
  const funds = listTargetFunds().filter((f) => f.status === "active");
  let matched: TargetFund | null = null;
  let bestLen = 0;
  funds.forEach((f) => {
    (f.aliases ?? []).forEach((alias) => {
      const aliasNorm = normalize(alias);
      if (aliasNorm && norm.includes(aliasNorm)) {
        if (aliasNorm.length > bestLen) {
          matched = f;
          bestLen = aliasNorm.length;
        }
      }
    });
  });
  return matched;
};
