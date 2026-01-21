import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import ReadingsClient from "../../../../admin/electricity/readings/ReadingsClient";
import ManualInputForm from "../../../../admin/electricity/readings/ManualInputForm";
import ImportCSV from "../../../../admin/electricity/readings/ImportCSV";

export default async function OfficeElectricityReadingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/electricity/readings");
  }

  const role = user.role;
  if (!isOfficeRole(role) && !isAdminRole(role)) {
    redirect("/forbidden?reason=office.only&next=/office/electricity/readings");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Показания электроэнергии</h1>
            <p className="mt-1 text-sm text-zinc-600">Просмотр и ввод показаний счётчиков</p>
          </div>
        </div>
        <ManualInputForm />
        <ImportCSV />
        <ReadingsClient />
      </div>
    </main>
  );
}
