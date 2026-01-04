import { HeaderClient } from "./HeaderClient";
import { getSessionUser } from "@/lib/session.server";
import { getOnboardingStatus, type OnboardingStatus } from "@/lib/onboardingStatus";
import { getUserOwnershipVerifications, getUserPlots } from "@/lib/plots";
import { getVerificationStatus, type VerificationStatus } from "@/lib/verificationStatus";

export default async function Header() {
  const session = await getSessionUser();
  let onboardingStatus: OnboardingStatus | null = null;
  let verificationStatus: VerificationStatus | null = null;
  if (session && session.role !== "admin") {
    onboardingStatus = await getOnboardingStatus(session.id ?? "");
  }
  if (session && (session.role === "user" || session.role === "board" || session.role === "admin")) {
    const [plots, verifications] = await Promise.all([
      getUserPlots(session.id ?? ""),
      getUserOwnershipVerifications(session.id ?? ""),
    ]);
    verificationStatus = getVerificationStatus(plots, verifications).status;
  }
  return (
    <HeaderClient
      role={session?.role ?? null}
      onboardingStatus={onboardingStatus}
      verificationStatus={verificationStatus}
    />
  );
}
