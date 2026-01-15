import { Suspense } from "react";
import { HeaderClient } from "./HeaderClient";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { getOnboardingStatus, type OnboardingStatus } from "@/lib/onboardingStatus";
import { getUserOwnershipVerifications, getUserPlots } from "@/lib/plots";
import { getVerificationStatus, type VerificationStatus } from "@/lib/verificationStatus";

export const dynamic = "force-static";

// Статичный Header для неавторизованных - не блокирует TTFB
function HeaderPublic() {
  return <HeaderClient role={null} onboardingStatus={null} verificationStatus={null} />;
}

// Динамический Header для авторизованных - под Suspense
async function HeaderAuthenticated() {
  const session = await getEffectiveSessionUser();
  
  if (!session) {
    return <HeaderClient role={null} onboardingStatus={null} verificationStatus={null} />;
  }
  
  let onboardingStatus: OnboardingStatus | null = null;
  let verificationStatus: VerificationStatus | null = null;
  
  if (session.role !== "admin") {
    onboardingStatus = await getOnboardingStatus(session.id ?? "");
  }
  
  if (
    session.role === "user" ||
    session.role === "board" ||
    session.role === "resident" ||
    session.role === "chairman" ||
    session.role === "admin"
  ) {
    const [plots, verifications] = await Promise.all([
      getUserPlots(session.id ?? ""),
      getUserOwnershipVerifications(session.id ?? ""),
    ]);
    verificationStatus = getVerificationStatus(plots, verifications).status;
  }
  
  return (
    <HeaderClient
      role={session.role ?? null}
      onboardingStatus={onboardingStatus}
      verificationStatus={verificationStatus}
    />
  );
}

export default function Header() {
  // Для public страниц показываем статичный Header сразу
  // Авторизованные пользователи получат динамический Header под Suspense
  // Это уменьшает TTFB на / и /login
  return (
    <Suspense fallback={<HeaderPublic />}>
      <HeaderAuthenticated />
    </Suspense>
  );
}
