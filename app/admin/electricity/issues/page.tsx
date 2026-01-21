import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import IssuesClient from "./IssuesClient";

export default async function ElectricityIssuesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff/login?next=/admin/electricity/issues");
  }
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    redirect("/forbidden?reason=admin.only&next=/admin/electricity/issues");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Проблемы по электроэнергии</h1>
            <p className="mt-1 text-sm text-zinc-600">Выявление проблем с показаниями счётчиков</p>
          </div>
          <a
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </a>
        </div>
        <IssuesClient />
      </div>
    </main>
  );
}
