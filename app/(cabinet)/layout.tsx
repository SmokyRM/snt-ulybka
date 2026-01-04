import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { findUserById } from "@/lib/mockDb";
import { stopImpersonation } from "../admin/impersonationActions";
import Header from "@/components/home/Header";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  // Guard in layout so client components never render for guests, avoiding hook-order issues.
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") {
      redirect("/admin");
    }
  }
  const isImpersonating = Boolean(user?.isImpersonating);
  const impersonator = user?.impersonatorAdminId ? findUserById(user.impersonatorAdminId) : null;

  return (
    <div className="min-h-screen bg-[#F8F1E9]">
      <Header />
      {isImpersonating && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold">Режим теста.</span>{" "}
              Вы просматриваете как{" "}
              <span className="font-semibold">{user?.fullName || user?.phone || user?.id}</span>. Админ:{" "}
              <span className="font-semibold">{impersonator?.fullName || impersonator?.phone || impersonator?.id || "—"}</span>.
            </div>
            <form action={stopImpersonation}>
              <button
                type="submit"
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-[11px] font-semibold text-amber-900 hover:border-amber-400"
              >
                Выйти из режима
              </button>
            </form>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
