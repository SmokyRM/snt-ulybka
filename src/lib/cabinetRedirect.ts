import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/userProfiles";
import { getUserPlots, getUserOwnershipVerifications } from "@/lib/plots";
import { getVerificationStatus } from "@/lib/verificationStatus";

export const resolveCabinetRedirect = async (userId: string) => {
  if (!userId) return null;
  const profile = await getUserProfile(userId);
  if (!profile.fullName || !profile.phone) {
    return "/cabinet/profile?onboarding=1";
  }

  const [plots, verifications] = await Promise.all([
    getUserPlots(userId),
    getUserOwnershipVerifications(userId),
  ]);
  const { status } = getVerificationStatus(plots, verifications);

  if (status === "pending") return "/cabinet/verification/status?status=pending";
  if (status === "verified") return null;

  // draft or rejected or no plots
  return "/cabinet/verification";
};

export const redirectToCabinetStep = async (userId: string) => {
  const target = await resolveCabinetRedirect(userId);
  if (target) redirect(target);
};
