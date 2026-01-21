import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import ReportClient from "../../../../admin/electricity/report/ReportClient";

export default async function OfficeElectricityReportPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/electricity/report");
  }

  const role = user.role;
  if (!isOfficeRole(role) && !isAdminRole(role)) {
    redirect("/forbidden?reason=office.only&next=/office/electricity/report");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Отчёт по электроэнергии</h1>
            <p className="mt-1 text-sm text-zinc-600">Начисления, оплаты и долги по участкам</p>
          </div>
        </div>
        <ReportClient />
      </div>
    </main>
  );
}
