import { redirect } from "next/navigation";
import Header from "@/components/home/Header";
import Link from "next/link";
import AssistantWidget from "@/components/AssistantWidget";
import { getEffectiveSessionUser, type SessionRole } from "@/lib/session.server";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";

const isCabinetAllowed = (role: SessionRole | undefined | null) =>
  role === "resident" ||
  role === "user" ||
  role === "admin" ||
  role === "chairman" ||
  role === "accountant" ||
  role === "secretary";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/login?next=/cabinet");
  }
  if (!isCabinetAllowed(user.role)) {
    redirect("/forbidden");
  }
  const residentId = (user as { residentId?: string | null }).residentId ?? null;
  const hasResidentId = Boolean(residentId);
  const isStaffLike =
    user.role === "admin" || user.role === "chairman" || user.role === "accountant" || user.role === "secretary";

  const flags = await getFeatureFlags().catch(() => null);
  const showWidget = flags ? isFeatureEnabled(flags, "ai_widget_enabled") : false;
  const personalEnabled = flags ? isFeatureEnabled(flags, "ai_personal_enabled") : false;
  const officeLinkRoles: SessionRole[] = ["admin", "chairman", "accountant", "secretary"];
  const effectiveRole = user.role as SessionRole | undefined;
  const canSeeOfficeLink = effectiveRole ? officeLinkRoles.includes(effectiveRole) : false;

  return (
    <div className="min-h-screen bg-[#F8F1E9]">
      <Header />
      <div className="border-b border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-600 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <span>Личный кабинет жителя</span>
          {canSeeOfficeLink ? (
            <Link
              href="/office"
              data-testid="cabinet-to-office"
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
            >
              Офис (для правления)
            </Link>
          ) : null}
        </div>
      </div>
      {isStaffLike && !hasResidentId ? (
        <div
          data-testid="cabinet-staff-no-resident"
          className="mx-auto mt-3 w-full max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:px-6"
        >
          <div className="font-semibold">У вас нет профиля жителя.</div>
          <p className="mt-1 text-amber-800">
            Привяжите участок, чтобы пользоваться кабинетом как житель. Это не влияет на доступ в офис.
          </p>
          <Link
            href="/cabinet/link-plot"
            className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 transition hover:ring-amber-300"
          >
            Привязать участок
          </Link>
        </div>
      ) : null}
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
