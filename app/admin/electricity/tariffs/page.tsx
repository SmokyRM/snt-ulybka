import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import ClientTariffs from "./ClientTariffs";

export default async function AdminTariffsPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/staff/login?next=/admin");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Тарифы на электроэнергию</h1>
          <a
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </a>
        </div>
        <ClientTariffs />
      </div>
    </main>
  );
}
