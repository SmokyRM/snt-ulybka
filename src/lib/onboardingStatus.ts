import { getMembershipStatus, getLatestMembershipRequestForUser } from "@/lib/membership";
import { getUserOwnershipVerifications } from "@/lib/plots";
import { getUserProfile } from "@/lib/userProfiles";

export type OnboardingStatus = "complete" | "draft" | "pending" | "rejected";

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  if (!userId) return "draft";
  const [profile, membership, verifications, latestRequest] = await Promise.all([
    getUserProfile(userId),
    getMembershipStatus(userId),
    getUserOwnershipVerifications(userId),
    getLatestMembershipRequestForUser(userId),
  ]);
  const profileComplete = Boolean(profile.fullName && profile.phone);
  const approved = verifications.filter((v) => v.status === "approved").length;
  const rejected = verifications.filter((v) => v.status === "rejected").length;
  const requestStatus = latestRequest?.status;

  if (approved > 0) return "complete";
  if (!profileComplete) return "draft";
  if (membership.status === "non-member" || rejected > 0) return "rejected";
  if (requestStatus === "rejected" || requestStatus === "needs_info") return "rejected";
  return "pending";
}
