import type { OwnershipVerification, UserPlotView } from "@/lib/plots";

export type VerificationStatus = "draft" | "pending" | "rejected" | "verified";

export function getVerificationStatus(
  plots: UserPlotView[],
  verifications: OwnershipVerification[],
): { status: VerificationStatus; latest?: OwnershipVerification } {
  const hasVerifiedPlot = plots.some((plot) => plot.ownershipStatus === "verified");
  const approved = verifications.filter((v) => v.status === "approved").length;
  const sent = verifications.filter((v) => v.status === "sent").length;
  const drafts = verifications.filter((v) => v.status === "draft").length;
  const latest = [...verifications].sort((a, b) => {
    const aTs = Date.parse(a.reviewedAt ?? a.createdAt);
    const bTs = Date.parse(b.reviewedAt ?? b.createdAt);
    return bTs - aTs;
  })[0];

  if (approved > 0 || hasVerifiedPlot) return { status: "verified", latest };
  if (latest?.status === "rejected") return { status: "rejected", latest };
  if (sent > 0) return { status: "pending", latest };
  if (drafts > 0) return { status: "draft", latest };
  return { status: "draft", latest };
}
