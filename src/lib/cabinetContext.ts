import { cookies } from "next/headers";
import { getUserFinanceInfo } from "@/lib/getUserFinanceInfo";
import { applyQaDebtOverride, getQaScenarioFromCookies } from "@/lib/qaScenario.server";

export type CabinetContext = {
  hasDebt: boolean;
  finance: Awaited<ReturnType<typeof getUserFinanceInfo>>;
};

/**
 * Server-only helper to centralize cabinet context (currently finance + hasDebt with QA override).
 */
export async function getCabinetContext(userId: string): Promise<CabinetContext> {
  const finance = await getUserFinanceInfo(userId);
  const hasDebtRaw = (finance.membershipDebt ?? 0) > 0 || (finance.electricityDebt ?? 0) > 0;
  const jar = await cookies();
  const qaScenario = await getQaScenarioFromCookies(jar);
  const hasDebt = applyQaDebtOverride(hasDebtRaw, qaScenario);
  return { hasDebt, finance };
}
