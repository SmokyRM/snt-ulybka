import type { OwnershipVerification } from "@/lib/plots";

export function normalizeOwnershipVerification(
  verification: OwnershipVerification,
): OwnershipVerification {
  return {
    ...verification,
    status: verification.status ?? "sent",
    reviewedAt: verification.reviewedAt ?? null,
    reviewNote: verification.reviewNote ?? null,
  };
}
