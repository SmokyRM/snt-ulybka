import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import RegistryImportClient from "./RegistryImportClient";

export default async function RegistryImportPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/registry/import");
  }

  const role = user.role;
  if (!isAdminRole(role) && !isOfficeRole(role)) {
    redirect("/forbidden?reason=admin.only&next=/admin/registry/import");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Импорт реестра</h1>
            <p className="text-sm text-zinc-600">Загрузите CSV или XLSX файл с данными участков и владельцев</p>
          </div>
        </div>

        <RegistryImportClient />
      </div>
    </main>
  );
}
