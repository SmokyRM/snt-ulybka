import { redirect } from "next/navigation";
import Header from "@/components/home/Header";
import Link from "next/link";
import AssistantWidget from "@/components/AssistantWidget";
import { getEffectiveSessionUser, type SessionRole } from "@/lib/session.server";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";
import { RoleIndicator } from "../_components/RoleIndicator";
import { canAccess } from "@/lib/rbac";
import GlobalLogoutButton from "../_components/GlobalLogoutButton";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/login?next=/cabinet");
  }
  // Используем RBAC для проверки доступа
  const role = user.role as "admin" | "chairman" | "secretary" | "accountant" | "resident" | "user" | "board" | undefined;
  const normalizedRole: "admin" | "chairman" | "secretary" | "accountant" | "resident" =
    role === "user" || role === "board" ? "resident" : role ?? "resident";
  const { can, getForbiddenReason } = await import("@/lib/rbac");
  if (!can(normalizedRole, "cabinet.access")) {
    const reason = getForbiddenReason(normalizedRole, "cabinet.access");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/cabinet")}`);
  }
  const residentId = (user as { residentId?: string | null }).residentId ?? null;
  const hasResidentId = Boolean(residentId);
  const isStaffLike =
    user.role === "admin" || user.role === "chairman" || user.role === "accountant" || user.role === "secretary";

  const flags = await getFeatureFlags().catch(() => null);
  const showWidget = flags ? isFeatureEnabled(flags, "ai_widget_enabled") : false;
  const personalEnabled = flags ? isFeatureEnabled(flags, "ai_personal_enabled") : false;
  const effectiveRole = normalizedRole;
  const canSeeOfficeLink = canAccess(effectiveRole, "office.access");
  const canSeeAdminLink = canAccess(effectiveRole, "admin.access");

  return (
    <div className="min-h-screen bg-[#F8F1E9]" data-testid="cabinet-root">
      <Header />
      <div className="border-b border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-600 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Личный кабинет жителя</span>
            <RoleIndicator />
          </div>
          <div className="flex items-center gap-2">
            {canSeeOfficeLink ? (
              <Link
                href="/office"
                data-testid="cabinet-to-office"
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
              >
                Офис (для правления)
              </Link>
            ) : null}
            {canSeeAdminLink ? (
              <Link
                href="/admin"
                data-testid="cabinet-to-admin"
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
              >
                Админка
              </Link>
            ) : null}
            <GlobalLogoutButton />
          </div>
        </div>
      </div>
      {isStaffLike && !hasResidentId ? (
        <div
          data-testid="cabinet-no-resident-profile"
          className="mx-auto mt-3 w-full max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:px-6"
        >
          <div className="font-semibold">У вас нет профиля жителя.</div>
          <p className="mt-1 text-amber-800">
            Привяжите участок, чтобы пользоваться кабинетом как житель. Это не влияет на доступ в офис.
          </p>
          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs text-amber-900" data-testid="cabinet-readonly-hint">
            Вы вошли как сотрудник. Кабинет жителя недоступен.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canSeeOfficeLink ? (
              <Link
                href="/office"
                data-testid="cabinet-cta-to-office"
                className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 transition hover:ring-amber-300"
              >
                Перейти в офис
              </Link>
            ) : null}
            {canSeeAdminLink ? (
              <Link
                href="/admin"
                data-testid="cabinet-cta-to-admin"
                className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 transition hover:ring-amber-300"
              >
                Перейти в админку
              </Link>
            ) : null}
            <Link
              href="/cabinet/link-plot"
              className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 transition hover:ring-amber-300"
            >
              Привязать участок
            </Link>
          </div>
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
