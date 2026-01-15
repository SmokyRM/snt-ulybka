import { getEffectiveSessionUser, getSessionUser, isAdmin } from "@/lib/session.server";
import { isAdminRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import AdminSidebar from "./_components/AdminSidebar";
import { serverFetchJson } from "@/lib/serverFetch";
import { viewAsAdmin } from "./adminViewActions";
import AdminSiteLink from "./AdminSiteLink";
import AdminDirtyProvider from "./AdminDirtyProvider";
import AdminNavigationProgressProvider from "./AdminNavigationProgress";
import AssistantWidget from "@/components/AssistantWidget";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";
import QaFloatingIndicator from "./_components/QaFloatingIndicator";
import { getQaScenarioFromCookies } from "@/lib/qaScenario.server";
import AdminQaBanner from "./_components/AdminQaBanner";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff/login?next=/admin");
  }
  // КРИТИЧНО: Проверяем что роль admin через isAdminRole
  // Это гарантирует что только admin может попасть в /admin
  if (!isAdminRole(user.role)) {
    // Debug log в dev режиме
    if (process.env.NODE_ENV !== "production") {
      console.warn("[admin-layout] Доступ запрещен:", {
        userId: user.id,
        role: user.role,
        isAdminRole: isAdminRole(user.role),
      });
    }
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
                {buildInfo ? (
                  <div className="text-xs text-zinc-600">
                    Build: {buildInfo.sha.slice(0, 7)} · Updated: {buildInfo.builtAt}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {admin ? (
                  <form action={viewAsAdmin}>
                    <button
                      type="submit"
                      className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
                    >
                      Смотреть как администратор
                    </button>
                  </form>
                ) : null}
                <AdminSiteLink />
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
        {/* QA компоненты только в dev или если ENABLE_QA=true в prod */}
        {process.env.NODE_ENV !== "production" || process.env.ENABLE_QA === "true" ? (
          <QaFloatingIndicator role={effectiveRole ?? null} />
        ) : null}
      </AdminNavigationProgressProvider>
    </AdminDirtyProvider>
  );
}
