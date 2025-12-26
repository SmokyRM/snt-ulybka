export type UserFinanceInfo = {
  membershipDebt: number | null;
  electricityDebt: number | null;
  status: "ok" | "debt" | "unknown";
};

export async function getUserFinanceInfo(_userId: string): Promise<UserFinanceInfo> {
  void _userId;
  // MVP: данные отсутствуют, возвращаем unknown.
  const membershipDebt: number | null = null;
  const electricityDebt: number | null = null;

  const hasData = membershipDebt !== null || electricityDebt !== null;
  const hasDebt =
    (typeof membershipDebt === "number" && membershipDebt > 0) ||
    (typeof electricityDebt === "number" && electricityDebt > 0);

  return {
    membershipDebt,
    electricityDebt,
    status: hasData ? (hasDebt ? "debt" : "ok") : "unknown",
  };
}
