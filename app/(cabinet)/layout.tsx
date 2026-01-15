import { redirect } from "next/navigation";
import Header from "@/components/home/Header";
import AssistantWidget from "@/components/AssistantWidget";
import { getSessionUser, type SessionRole } from "@/lib/session.server";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";

const isResidentRole = (role: SessionRole | undefined | null) =>
  role === "resident" || role === "user";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/cabinet");
  }
  if (!isResidentRole(user.role)) {
    redirect("/forbidden");
  }

  const flags = await getFeatureFlags().catch(() => null);
  const showWidget = flags ? isFeatureEnabled(flags, "ai_widget_enabled") : false;
  const personalEnabled = flags ? isFeatureEnabled(flags, "ai_personal_enabled") : false;

  return (
    <div className="min-h-screen bg-[#F8F1E9]">
      <Header />
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
