import { redirect } from "next/navigation";
import Header from "@/components/home/Header";
import AssistantWidget from "@/components/AssistantWidget";
import { requirePermission } from "@/lib/authGuard";
import { type SessionRole } from "@/lib/session.server";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";
import { isAdminRole, isOfficeRole, normalizeRole } from "@/lib/rbac";
import CabinetNav from "./cabinet/CabinetNav";
import { logStructured } from "@/lib/structuredLogger/node";

const isResidentRole = (role: SessionRole | undefined | null) =>
  role === "resident" || role === "user";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const isDev = process.env.NODE_ENV !== "production";
  const user = await requirePermission("cabinet.access", {
    kind: "user",
    nextPath: "/cabinet",
    forbiddenReason: "cabinet.only",
  });
  // КРИТИЧНО: admin и office роли (chairman/secretary/accountant) имеют доступ к /cabinet
  const normalizedRole = normalizeRole(user.role);
  if (isAdminRole(normalizedRole)) {
    // admin bypass - пропускаем
  } else if (isOfficeRole(normalizedRole)) {
    // office роли (chairman/secretary/accountant) имеют доступ к /cabinet
    // пропускаем
  } else if (!isResidentRole(user.role)) {
    if (isDev) {
      logStructured("info", {
        action: "guard-redirect",
        path: "/cabinet (layout)",
        role: String(normalizedRole),
        message: "cabinet.only",
        redirectTo: "/forbidden",
      });
    }
    redirect("/forbidden?reason=cabinet.only&next=/cabinet&src=layout");
  }

  const flags = await getFeatureFlags().catch(() => null);
  const showWidget = flags ? isFeatureEnabled(flags, "ai_widget_enabled") : false;
  const personalEnabled = flags ? isFeatureEnabled(flags, "ai_personal_enabled") : false;

  return (
    <div className="min-h-screen bg-[#F8F1E9]" data-testid="cabinet-root">
      <Header />
      <CabinetNav />
      {children}
      {showWidget ? (
        <AssistantWidget
          variant="public"
          initialAuth={Boolean(user)}
          initialRole={user?.role === "user" ? "user" : null}
          aiPersonalEnabled={personalEnabled}
        />
      ) : null}
    </div>
  );
}
