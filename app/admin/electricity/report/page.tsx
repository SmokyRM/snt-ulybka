import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import ReportClient from "./ReportClient";
import AdminHelp from "../../_components/AdminHelp";

export default async function ElectricityReportPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff/login?next=/admin/electricity/report");
  }
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    redirect("/forbidden?reason=admin.only&next=/admin/electricity/report");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Отчёт по электроэнергии</h1>
          <a
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </a>
        </div>
        <AdminHelp
          title="Об отчёте по электроэнергии"
          content="Отчёт показывает начисления и долги по электроэнергии за выбранный период. Используйте фильтры для поиска по участку или просмотра только должников. Экспортируйте данные в CSV для дальнейшей обработки."
        />
        <ReportClient />
      </div>
    </main>
  );
}
