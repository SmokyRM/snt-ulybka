import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, normalizeRole } from "@/lib/rbac";
import RegistryImportHistoryClient from "./RegistryImportHistoryClient";

export default async function RegistryImportHistoryPage() {
  // Check production
  if (process.env.NODE_ENV === "production") {
    redirect("/admin/registry");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/registry/import/history");
  }

  const normalizedRole = normalizeRole(user.role);
  if (!isAdminRole(normalizedRole)) {
    redirect("/forbidden?reason=admin.only&next=/admin/registry/import/history");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">История импортов реестра</h1>
            <p className="text-sm text-zinc-600">Список всех выполненных импортов</p>
          </div>
        </div>

        <RegistryImportHistoryClient />
      </div>
    </main>
  );
}
