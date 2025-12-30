import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import ReportClient from "./ReportClient";

export default async function ElectricityReportPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/login?next=/admin");
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
        <ReportClient />
      </div>
    </main>
  );
}
