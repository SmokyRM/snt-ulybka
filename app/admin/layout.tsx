import { getSessionUser, hasImportAccess, isAdmin } from "@/lib/session.server";
import { redirect } from "next/navigation";
import AdminSidebar from "./_components/AdminSidebar";
import { serverFetchJson } from "@/lib/serverFetch";
import { viewAsAdmin, viewAsUser } from "./adminViewActions";
import AdminSiteLink from "./AdminSiteLink";
import AdminDirtyProvider from "./AdminDirtyProvider";
import AdminNavigationProgressProvider from "./AdminNavigationProgress";
import AdminViewAsUserButton from "./AdminViewAsUserButton";
import AssistantWidget from "@/components/AssistantWidget";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const admin = isAdmin(user);
  const hasAccess = hasImportAccess(user);
  if (!hasAccess) {
    redirect("/login?next=/admin");
  }
  const isDev = process.env.NODE_ENV !== "production";

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
          <AdminSidebar isAdmin={admin} isDev={isDev} role={user?.role ?? "user"} />
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
                <AdminSiteLink />
              </div>
          </header>
            <main className="px-6 py-6">{children}</main>
          </div>
        </div>
        {hasAccess ? <AssistantWidget variant="admin" initialAuth={Boolean(user)} /> : null}
      </AdminNavigationProgressProvider>
    </AdminDirtyProvider>
  );
}
