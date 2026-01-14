import { getEffectiveSessionUser, getSessionUser, isAdmin } from "@/lib/session.server";
import { redirect } from "next/navigation";
import AdminSidebar from "./_components/AdminSidebar";
import { serverFetchJson } from "@/lib/serverFetch";
import { viewAsAdmin, viewAsUser } from "./adminViewActions";
import AdminSiteLink from "./AdminSiteLink";
import AdminDirtyProvider from "./AdminDirtyProvider";
import AdminNavigationProgressProvider from "./AdminNavigationProgress";
import AdminViewAsUserButton from "./AdminViewAsUserButton";
import AssistantWidget from "@/components/AssistantWidget";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";
import QaFloatingIndicator from "./_components/QaFloatingIndicator";
import { getQaScenarioFromCookies } from "@/lib/qaScenario.server";
import AdminQaBanner from "./_components/AdminQaBanner";
import { canAccess, type Role as RbacRole } from "@/lib/rbac";
import Link from "next/link";
import GlobalLogoutButton from "../_components/GlobalLogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (user.role !== "admin") {
    redirect("/forbidden");
  }
  const effectiveUser = await getEffectiveSessionUser();
  const qaScenario = await getQaScenarioFromCookies();
  const effectiveRole: "admin" | "board" | "user" | "accountant" | "operator" | "resident" | "chairman" | "secretary" =
    (effectiveUser?.role as
      | "admin"
      | "board"
      | "user"
      | "accountant"
      | "operator"
      | "resident"
      | "chairman"
      | "secretary") ?? user.role;
  const admin = isAdmin(user);
  const isDev = process.env.NODE_ENV !== "production";
  const flags = await getFeatureFlags().catch(() => null);
  const widgetEnabled = flags ? isFeatureEnabled(flags, "ai_widget_enabled") : false;
  const allowPreview = user?.role === "admin" || user?.role === "board";
  const showAssistant = widgetEnabled || allowPreview;

  let buildInfo: { sha: string; builtAt: string } | null = null;
  try {
    buildInfo = await serverFetchJson<{ sha: string; builtAt: string }>("/admin/build-info");
  } catch {
    buildInfo = null;
  }

  return (
    <AdminDirtyProvider>
      <AdminNavigationProgressProvider>
        <div className="flex min-h-screen bg-[#F8F1E9] text-zinc-900">
          <AdminSidebar isAdmin={effectiveRole === "admin"} isDev={isDev} role={effectiveRole} />
          <div className="flex-1">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-4">
              <div className="space-y-1">
                <h1 className="text-lg font-semibold">Админка СНТ «Улыбка»</h1>
                <div className="text-xs text-zinc-600" data-testid="role-indicator">
                  Роль: Администратор{qaScenario ? " (QA)" : ""}
                </div>
                {buildInfo ? (
                  <div className="text-xs text-zinc-600">
                    Build: {buildInfo.sha.slice(0, 7)} · Updated: {buildInfo.builtAt}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {admin ? (
                  <>
                    <form action={viewAsAdmin}>
                      <button
                        type="submit"
                        className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
                      >
                        Смотреть как администратор
                      </button>
                    </form>
                    <AdminViewAsUserButton action={viewAsUser} />
                  </>
                ) : null}
                {canAccess(effectiveRole as RbacRole, "office.access") ? (
                  <Link
                    href="/office"
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
                    data-testid="admin-cta-office"
                  >
                    Офис
                  </Link>
                ) : null}
                {canAccess(effectiveRole as RbacRole, "cabinet.access") ? (
                  <Link
                    href="/cabinet"
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
                    data-testid="admin-cta-cabinet"
                  >
                    Кабинет
                  </Link>
                ) : null}
                <AdminSiteLink />
                <GlobalLogoutButton />
              </div>
              {qaScenario ? <AdminQaBanner scenario={qaScenario} /> : null}
          </header>
            <main className="px-6 py-6">{children}</main>
          </div>
        </div>
        {showAssistant ? (
          <AssistantWidget
            variant="admin"
            initialAuth={Boolean(user)}
            initialRole={
              effectiveRole === "admin" || effectiveRole === "board" || effectiveRole === "user"
                ? effectiveRole
                : null
            }
            aiPersonalEnabled={flags ? isFeatureEnabled(flags, "ai_personal_enabled") : false}
          />
        ) : null}
        <QaFloatingIndicator role={effectiveRole ?? null} />
      </AdminNavigationProgressProvider>
    </AdminDirtyProvider>
  );
}
