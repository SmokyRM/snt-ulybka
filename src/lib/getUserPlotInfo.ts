export type PlotInfo = {
  plotNumber: string | null;
  street: string | null;
  membershipStatus: "member" | "non-member" | "unknown";
};

const mockUserPlots: Record<string, PlotInfo> = {
  // Примерные данные, MVP
  admin: { plotNumber: "1", street: "Центральная", membershipStatus: "member" },
};

export async function getUserPlotInfo(userId: string): Promise<PlotInfo> {
  const info = mockUserPlots[userId];
  if (info) return info;
  return {
    plotNumber: null,
    street: null,
    membershipStatus: "unknown",
  };
}
